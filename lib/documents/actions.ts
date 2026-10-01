"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import Decimal from "decimal.js";
import type { PoolClient } from "pg";
import { requireUser } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { calculateQuotation } from "./calculations";
import { canIssueInvoice, canManageBillingNote, canWriteOwnedDocument } from "./types";
import { canTransitionQuotation } from "./permissions";
import type { QuoteLineInput, TaxBasis } from "./types";

const uuid = z.string().uuid();
const lineSchema = z.object({
  productId: uuid.nullish(),
  sourcePriceListItemId: uuid.nullish(),
  productCodeSnapshot: z.string().max(200).optional(),
  nameSnapshot: z.string().trim().min(1).max(1000).optional(),
  descriptionSnapshot: z.string().max(10000).optional(),
  unitSnapshot: z.string().trim().min(1).max(100).optional(),
  warrantySnapshot: z.string().max(1000).optional(),
  quantity: z.union([z.string(), z.number()]),
  unitPrice: z.union([z.string(), z.number()]),
  taxBasis: z.enum(["exclusive", "inclusive"]),
  vatRate: z.union([z.string(), z.number()]),
  taxCode: z.enum(["standard", "zero", "exempt"]).optional(),
  lineDiscountAmount: z.union([z.string(), z.number()]).optional(),
  whtRate: z.union([z.string(), z.number()]).optional(),
});
const quoteInputSchema = z.object({
  customerId: uuid,
  documentDate: z.string().date().optional(),
  validUntil: z.string().date().optional(),
  paymentTerms: z.string().max(2000).optional(),
  deliveryTerms: z.string().max(2000).optional(),
  notes: z.string().max(5000).optional(),
  documentDiscountAmount: z.union([z.string(), z.number()]).optional(),
  lines: z.array(lineSchema).min(1).max(200),
});
const invoiceMetaSchema = z.object({
  invoiceNo: z.string().trim().min(1).max(80).regex(/^[\p{L}\p{N}][\p{L}\p{N}._\-/ ]*$/u),
  documentTitle: z.enum(["ใบแจ้งหนี้", "Invoice"]),
  documentDate: z.string().date(),
  dueDate: z.string().date().optional(),
}).superRefine((value, ctx) => {
  if (value.dueDate && value.dueDate < value.documentDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dueDate"], message: "วันครบกำหนดต้องไม่ก่อนวันที่เอกสาร" });
  }
});

type ActionResult = { ok: true; id: string; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
const safeError = (error: unknown, fallback = "ไม่สามารถบันทึกเอกสารได้") => {
  if (error instanceof Error && /[\u0E00-\u0E7F]/.test(error.message)) return error.message;
  if (error instanceof Error && /column|constraint|violates|relation|duplicate key/i.test(error.message)) return error.message;
  if (error instanceof Error && /must be|At least|invalid|greater|non-negative/i.test(error.message)) return error.message;
  return fallback;
};

function readQuoteInput(formData: FormData): z.infer<typeof quoteInputSchema> {
  const rawLines = String(formData.get("lines") ?? "[]");
  let lines: unknown;
  try { lines = JSON.parse(rawLines); } catch { lines = []; }
  const parsed = quoteInputSchema.safeParse({
    customerId: String(formData.get("customerId") ?? ""),
    documentDate: String(formData.get("documentDate") ?? "") || undefined,
    validUntil: String(formData.get("validUntil") ?? "") || undefined,
    paymentTerms: String(formData.get("paymentTerms") ?? ""),
    deliveryTerms: String(formData.get("deliveryTerms") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    documentDiscountAmount: String(formData.get("documentDiscountAmount") ?? "0"),
    lines,
  });
  if (!parsed.success) throw parsed.error;
  return parsed.data;
}

async function buildQuoteData(client: PoolClient, input: z.infer<typeof quoteInputSchema>, ownerId: string) {
  const customer = await client.query<{
    id: string; customer_code: string; legal_name: string; tax_id: string | null; branch_name: string;
    address: string; contact_name: string; contact_phone: string; contact_email: string; credit_days: number | null;
    billing_schedule: string; payment_schedule: string;
  }>(`SELECT id, customer_code, legal_name, tax_id, branch_name, address, contact_name, contact_phone,
             contact_email, credit_days, billing_schedule, payment_schedule
        FROM customers WHERE id = $1 AND is_active = true`, [input.customerId]);
  const customerRow = customer.rows[0];
  if (!customerRow) throw new Error("ไม่พบลูกค้าที่เลือกหรือไม่พร้อมใช้งาน");
  const settings = await client.query<{ legal_name: string; tax_id: string; address: string; phone: string; email: string }>(
    "SELECT legal_name, tax_id, address, phone, email FROM company_settings WHERE id = true",
  );
  const seller = settings.rows[0] ?? { legal_name: "บริษัทของคุณ", tax_id: "", address: "", phone: "", email: "" };
  const requestedLines = input.lines as QuoteLineInput[];
  const resolvedLines: QuoteLineInput[] = [];
  const products: Array<{ id: string; product_code: string; name: string; description: string; unit: string; warranty: string }> = [];
  for (const [index, line] of requestedLines.entries()) {
    let resolved = { ...line };
    if (line.sourcePriceListItemId) {
      const price = await client.query<{ product_id: string; selling_price: string; tax_basis: TaxBasis; vat_rate: string }>(
        `SELECT i.product_id, i.selling_price::text, i.tax_basis, i.vat_rate::text
           FROM price_list_items i JOIN price_lists p ON p.id = i.price_list_id
          WHERE i.id = $1 AND p.status = 'published'
            AND p.valid_from <= COALESCE($2::date, CURRENT_DATE)
            AND (p.valid_to IS NULL OR p.valid_to >= COALESCE($2::date, CURRENT_DATE))`,
        [line.sourcePriceListItemId, input.documentDate ?? null],
      );
      if (!price.rows[0]) throw new Error(`ไม่พบราคาที่เผยแพร่สำหรับรายการที่ ${index + 1}`);
      if (!line.productId || price.rows[0].product_id !== line.productId) {
        throw new Error(`ราคาที่เลือกรายการที่ ${index + 1} ไม่ตรงกับสินค้า`);
      }
      resolved = { ...resolved, unitPrice: price.rows[0].selling_price, taxBasis: price.rows[0].tax_basis, vatRate: price.rows[0].vat_rate };
    }
    if (!line.productId) throw new Error(`กรุณาเลือกสินค้าในรายการที่ ${index + 1}`);
    const product = await client.query<{ id: string; product_code: string; name: string; description: string; unit: string; warranty: string }>(
      "SELECT id, product_code, name, description, unit, warranty FROM products WHERE id = $1 AND is_active = true", [line.productId],
    );
    if (!product.rows[0]) throw new Error(`ไม่พบสินค้าในรายการที่ ${index + 1}`);
    products.push(product.rows[0]);
    resolvedLines.push(resolved);
  }
  const calculation = calculateQuotation(resolvedLines, input.documentDiscountAmount ?? 0);
  return { customerRow, seller, products, resolvedLines, calculation, ownerId };
}

async function persistQuotation(client: PoolClient, input: z.infer<typeof quoteInputSchema>, ownerId: string, quoteId?: string): Promise<string> {
  const built = await buildQuoteData(client, input, ownerId);
  const date = input.documentDate ?? new Date().toISOString().slice(0, 10);
  let quotationId = quoteId;
  let revisionNo = 1;
  if (quoteId) {
    const existing = await client.query<{ id: string; status: string; owner_user_id: string }>(
      "SELECT id, status, owner_user_id FROM quotations WHERE id = $1 FOR UPDATE", [quoteId],
    );
    const row = existing.rows[0];
    if (!row || row.status !== "draft") throw new Error("เอกสารนี้ถูกส่งแล้วและแก้ไขไม่ได้");
    const revision = await client.query<{ revision_no: number }>("SELECT revision_no FROM quotation_revisions WHERE quotation_id = $1 ORDER BY revision_no DESC LIMIT 1", [quoteId]);
    revisionNo = (revision.rows[0]?.revision_no ?? 0) + 1;
    await client.query("DELETE FROM quotation_items WHERE quotation_revision_id IN (SELECT id FROM quotation_revisions WHERE quotation_id = $1 AND status = 'draft')", [quoteId]);
  } else {
    const sequence = await client.query<{ reserve_document_number: string }>("SELECT reserve_document_number('quotation')::text");
    const number = sequence.rows[0]?.reserve_document_number;
    if (!number) throw new Error("ไม่สามารถออกเลขใบเสนอราคาได้");
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO quotations(quotation_no, customer_id, owner_user_id) VALUES ($1, $2, $3) RETURNING id`,
      [`QT-${date.slice(0, 4)}-${String(number).padStart(6, "0")}`, input.customerId, ownerId],
    );
    quotationId = inserted.rows[0]?.id;
  }
  if (!quotationId) throw new Error("ไม่สามารถสร้างเอกสารได้");
  const sellerSnapshot = { schema_version: 1, ...built.seller };
  const customerSnapshot = { schema_version: 1, customer_code: built.customerRow.customer_code, legal_name: built.customerRow.legal_name, tax_id: built.customerRow.tax_id ?? "", branch_name: built.customerRow.branch_name, address: built.customerRow.address, credit_days: built.customerRow.credit_days, billing_schedule: built.customerRow.billing_schedule, payment_schedule: built.customerRow.payment_schedule };
  const revision = await client.query<{ id: string }>(
    `INSERT INTO quotation_revisions
      (quotation_id, revision_no, document_date, valid_until, seller_snapshot, customer_snapshot, contact_snapshot,
       payment_terms, delivery_terms, notes, subtotal, line_discount_total, document_discount_amount, taxable_amount,
       vat_amount, grand_total, estimated_wht_amount, estimated_receivable, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'draft',$19)
     RETURNING id`,
    [quotationId, revisionNo, date, input.validUntil ?? null, sellerSnapshot, customerSnapshot,
      { schema_version: 1, name: built.customerRow.contact_name, phone: built.customerRow.contact_phone, email: built.customerRow.contact_email },
      input.paymentTerms ?? "", input.deliveryTerms ?? "", input.notes ?? "", built.calculation.subtotal, built.calculation.lineDiscountTotal,
      built.calculation.documentDiscountAmount, built.calculation.taxableAmount, built.calculation.vatAmount, built.calculation.grandTotal,
      built.calculation.estimatedWhtAmount, built.calculation.estimatedReceivable, ownerId],
  );
  const revisionId = revision.rows[0]?.id;
  if (!revisionId) throw new Error("ไม่สามารถสร้างฉบับเอกสารได้");
  for (const [i, line] of built.calculation.lines.entries()) {
    const product = built.products[i];
    await client.query(
      `INSERT INTO quotation_items
       (quotation_revision_id,line_no,product_id,source_price_list_item_id,product_code_snapshot,name_snapshot,description_snapshot,unit_snapshot,
        quantity,unit_price_ex_vat,input_tax_basis,input_unit_price,line_discount_amount,document_discount_allocated,tax_code,vat_rate,
        net_amount,vat_amount,total_amount,wht_rate,wht_base_amount,warranty_snapshot)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
      [revisionId, line.lineNo, line.productId, line.sourcePriceListItemId, line.productCodeSnapshot ?? product.product_code,
        line.nameSnapshot ?? product.name, line.descriptionSnapshot ?? product.description, line.unitSnapshot ?? product.unit,
        line.quantity, line.unitPriceExVat, line.taxBasis, line.inputUnitPrice, line.lineDiscountAmount, line.documentDiscountAllocated,
        line.taxCode, line.vatRate, line.netAmount, line.vatAmount, line.totalAmount, line.whtRate, line.whtBaseAmount,
        line.warrantySnapshot ?? product.warranty],
    );
  }
  await client.query("UPDATE quotations SET current_revision_id = $2, updated_at = now() WHERE id = $1", [quotationId, revisionId]);
  return quotationId;
}

export async function createQuotation(formData: FormData): Promise<ActionResult> {
  const user = await requireUser(["admin", "manager", "sales"]);
  try {
    const input = readQuoteInput(formData);
    const id = await transaction((client) => persistQuotation(client, input, user.id));
    revalidatePath("/quotations");
    return { ok: true, id, message: "บันทึกใบเสนอราคาแล้ว" };
  } catch (error) {
    return { ok: false, error: safeError(error), fieldErrors: error instanceof z.ZodError ? error.flatten().fieldErrors as Record<string, string[]> : undefined };
  }
}

export async function updateQuotation(quotationId: string, formData: FormData): Promise<ActionResult> {
  const user = await requireUser(["admin", "manager", "sales"]);
  if (!uuid.safeParse(quotationId).success) return { ok: false, error: "รหัสเอกสารไม่ถูกต้อง" };
  try {
    const input = readQuoteInput(formData);
    const id = await transaction(async (client) => {
      const owner = await client.query<{ owner_user_id: string; status: string }>("SELECT owner_user_id, status FROM quotations WHERE id = $1 FOR UPDATE", [quotationId]);
      if (!owner.rows[0] || owner.rows[0].status !== "draft" || !canWriteOwnedDocument(user, owner.rows[0].owner_user_id)) throw new Error("คุณไม่มีสิทธิ์แก้ไขเอกสารนี้");
      return persistQuotation(client, input, user.id, quotationId);
    });
    revalidatePath(`/quotations/${id}`); revalidatePath("/quotations");
    return { ok: true, id, message: "ปรับปรุงใบเสนอราคาแล้ว" };
  } catch (error) { return { ok: false, error: safeError(error) }; }
}

async function transitionQuotation(id: string, target: "sent" | "accepted" | "cancelled"): Promise<ActionResult> {
  const user = await requireUser(["admin", "manager", "sales"]);
  if (!uuid.safeParse(id).success) return { ok: false, error: "รหัสเอกสารไม่ถูกต้อง" };
  try {
    await transaction(async (client) => {
      const rows = await client.query<{ owner_user_id: string; status: "draft" | "sent" | "accepted" | "cancelled"; current_revision_id: string }>("SELECT owner_user_id, status, current_revision_id FROM quotations WHERE id = $1 FOR UPDATE", [id]);
      const quote = rows.rows[0];
      if (!quote) throw new Error("ไม่พบใบเสนอราคา");
      if (!canTransitionQuotation(user, quote.owner_user_id, quote.status, target)) throw new Error(`ไม่อนุญาตให้เปลี่ยนสถานะจาก ${quote.status} เป็น ${target}`);
      if (target !== "cancelled") {
        const count = await client.query<{ count: string }>("SELECT count(*)::text AS count FROM quotation_items WHERE quotation_revision_id = $1", [quote.current_revision_id]);
        if (Number(count.rows[0]?.count ?? 0) === 0) throw new Error("ใบเสนอราคาต้องมีรายการสินค้าอย่างน้อยหนึ่งรายการ");
      }
      await client.query("UPDATE quotations SET status = $2, updated_at = now() WHERE id = $1", [id, target]);
      await client.query("UPDATE quotation_revisions SET status = $2, updated_at = now() WHERE id = $1", [quote.current_revision_id, target]);
      await client.query("INSERT INTO document_events(quotation_id,event_type,actor_id) VALUES($1,$2,$3)", [id, target, user.id]);
    });
    revalidatePath(`/quotations/${id}`); revalidatePath("/quotations");
    return { ok: true, id, message: target === "sent" ? "ส่งใบเสนอราคาแล้ว" : target === "accepted" ? "บันทึกการตอบรับแล้ว" : "ยกเลิกเอกสารแล้ว" };
  } catch (error) { return { ok: false, error: safeError(error, "ไม่สามารถเปลี่ยนสถานะเอกสารได้") }; }
}
export async function sendQuotation(id: string): Promise<ActionResult> { return transitionQuotation(id, "sent"); }
export async function acceptQuotation(id: string): Promise<ActionResult> { return transitionQuotation(id, "accepted"); }
export async function cancelQuotation(id: string): Promise<ActionResult> { return transitionQuotation(id, "cancelled"); }

const invoiceIssueSchema = z.object({
  itemIds: z.array(uuid).min(1),
  whtRate: z.union([z.string(), z.number()]).default("0"),
});

const manualInvoiceSchema = z.object({
  customerId: uuid,
  documentDate: z.string().date(),
  dueDate: z.string().date().optional(),
  documentTitle: z.enum(["ใบแจ้งหนี้", "Invoice"]).default("ใบแจ้งหนี้"),
  paymentTerms: z.string().max(2000).optional(),
  whtRate: z.union([z.string(), z.number()]).default("0"),
  lines: z.array(lineSchema.extend({
    nameSnapshot: z.string().trim().min(1).max(1000),
  })).min(1).max(200),
}).superRefine((value, ctx) => {
  if (value.dueDate && value.dueDate < value.documentDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dueDate"], message: "วันครบกำหนดต้องไม่ก่อนวันที่เอกสาร" });
  }
});

function readManualInvoiceInput(formData: FormData) {
  let lines: unknown;
  try { lines = JSON.parse(String(formData.get("lines") ?? "[]")); } catch { lines = []; }
  const parsed = manualInvoiceSchema.safeParse({
    customerId: String(formData.get("customerId") ?? ""),
    documentDate: String(formData.get("documentDate") ?? ""),
    dueDate: String(formData.get("dueDate") ?? "") || undefined,
    documentTitle: String(formData.get("documentTitle") ?? "ใบแจ้งหนี้"),
    paymentTerms: String(formData.get("paymentTerms") ?? ""),
    whtRate: String(formData.get("whtRate") ?? "0"),
    lines,
  });
  if (!parsed.success) throw parsed.error;
  return parsed.data;
}

export async function createManualInvoice(formData: FormData): Promise<ActionResult> {
  const user = await requireUser(["admin", "manager", "accounting"]);
  try {
    const input = readManualInvoiceInput(formData);
    const invoiceId = await transaction(async (client) => {
      const customerResult = await client.query<any>(`SELECT id, customer_code, legal_name, tax_id, branch_name, address,
          contact_name, contact_phone, contact_email, credit_days, billing_schedule, payment_schedule
        FROM customers WHERE id=$1 AND is_active=true`, [input.customerId]);
      const customer = customerResult.rows[0];
      if (!customer) throw new Error("ไม่พบลูกค้าที่เลือกหรือไม่พร้อมใช้งาน");
      const settings = await client.query<any>("SELECT legal_name,tax_id,address,phone,email,bank_name,bank_branch,bank_account_no FROM company_settings WHERE id=true");
      const seller = settings.rows[0] ?? { legal_name: "บริษัทของคุณ", tax_id: "", address: "", phone: "", email: "" };
      const rate = new Decimal(input.whtRate);
      if (!rate.isFinite() || rate.isNegative() || rate.greaterThan(100)) throw new Error("อัตราหัก ณ ที่จ่ายไม่ถูกต้อง");
      const calculation = calculateQuotation(input.lines as QuoteLineInput[], 0);
      const sequence = await client.query<{ reserve_document_number: string }>("SELECT reserve_document_number('invoice')::text");
      const number = sequence.rows[0]?.reserve_document_number;
      if (!number) throw new Error("ไม่สามารถออกเลขใบแจ้งหนี้ได้");
      const estimatedWht = new Decimal(calculation.taxableAmount).mul(rate).div(100).toDecimalPlaces(2).toFixed(2);
      const receivable = new Decimal(calculation.grandTotal).minus(estimatedWht).toDecimalPlaces(2).toFixed(2);
      const sellerSnapshot = { schema_version: 1, ...seller };
      const customerSnapshot = { schema_version: 1, customer_code: customer.customer_code, legal_name: customer.legal_name,
        tax_id: customer.tax_id ?? "", branch_name: customer.branch_name, address: customer.address,
        credit_days: customer.credit_days, billing_schedule: customer.billing_schedule, payment_schedule: customer.payment_schedule };
      const inserted = await client.query<{ id: string }>(`INSERT INTO invoices
        (invoice_no,customer_id,source_quotation_id,source_quotation_revision_id,document_date,due_date,document_title,seller_snapshot,customer_snapshot,payment_terms,tax_mode,subtotal,line_discount_total,document_discount_amount,taxable_amount,vat_amount,grand_total,estimated_wht_amount,estimated_receivable,wht_rate,created_by)
        VALUES($1,$2,NULL,NULL,$3,$4,$5,$6,$7,$8,'per_line',$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id`,
        [`IN-${String(number).padStart(6, "0")}`, input.customerId, input.documentDate, input.dueDate ?? null, input.documentTitle,
          sellerSnapshot, customerSnapshot, input.paymentTerms ?? "", calculation.subtotal, calculation.lineDiscountTotal,
          calculation.documentDiscountAmount, calculation.taxableAmount, calculation.vatAmount, calculation.grandTotal,
          estimatedWht, receivable, rate.toFixed(4), user.id]);
      const id = inserted.rows[0]?.id;
      if (!id) throw new Error("ไม่สามารถสร้างใบแจ้งหนี้ได้");
      for (const line of calculation.lines) {
        await client.query(`INSERT INTO invoice_items
          (invoice_id,line_no,source_quotation_item_id,product_id,product_code_snapshot,name_snapshot,description_snapshot,unit_snapshot,quantity,unit_price_ex_vat,input_tax_basis,input_unit_price,line_discount_amount,document_discount_allocated,tax_code,vat_rate,net_amount,vat_amount,total_amount,wht_rate,wht_base_amount)
          VALUES($1,$2,NULL,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
          [id, line.lineNo, line.productId, line.productCodeSnapshot ?? "", line.nameSnapshot ?? "", line.descriptionSnapshot ?? "", line.unitSnapshot ?? "ชิ้น",
            line.quantity, line.unitPriceExVat, line.taxBasis, line.inputUnitPrice, line.lineDiscountAmount, line.documentDiscountAllocated,
            line.taxCode, line.vatRate, line.netAmount, line.vatAmount, line.totalAmount, rate.toFixed(4), line.netAmount]);
      }
      await client.query("INSERT INTO document_events(invoice_id,event_type,actor_id,reason) VALUES($1,'issued',$2,'สร้างใบแจ้งหนี้โดยตรง')", [id, user.id]);
      return id;
    });
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${invoiceId}`);
    return { ok: true, id: invoiceId, message: "สร้างใบแจ้งหนี้แล้ว" };
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, error: "ข้อมูลใบแจ้งหนี้ไม่ถูกต้อง", fieldErrors: error.flatten().fieldErrors as Record<string, string[]> };
    return { ok: false, error: safeError(error, "ไม่สามารถสร้างใบแจ้งหนี้ได้") };
  }
}

export async function issueInvoice(quotationId: string, itemIds?: string[], whtRate?: string | number): Promise<ActionResult> {
  const user = await requireUser(["admin", "manager", "accounting"]);
  if (!canIssueInvoice(user)) return { ok: false, error: "คุณไม่มีสิทธิ์ออกใบแจ้งหนี้" };
  if (!uuid.safeParse(quotationId).success) return { ok: false, error: "รหัสเอกสารไม่ถูกต้อง" };
  try {
    const invoiceId = await transaction(async (client) => {
      const quoteResult = await client.query<any>(`SELECT q.*, r.* FROM quotations q JOIN quotation_revisions r ON r.id = q.current_revision_id WHERE q.id = $1 FOR UPDATE`, [quotationId]);
      const quote = quoteResult.rows[0];
      if (!quote) throw new Error("ไม่พบใบเสนอราคา");
      if (quote.status !== "accepted") throw new Error("ออกใบแจ้งหนี้ได้เมื่อใบเสนอราคาได้รับการตอบรับแล้ว");
      const requested = invoiceIssueSchema.safeParse({ itemIds: itemIds ?? [], whtRate: whtRate ?? "0" });
      if (!requested.success) throw new Error("กรุณาเลือกรายการสินค้าอย่างน้อยหนึ่งรายการ");
      const rate = new Decimal(requested.data.whtRate);
      if (!rate.isFinite() || rate.isNegative() || rate.greaterThan(100)) throw new Error("อัตราหัก ณ ที่จ่ายไม่ถูกต้อง");
      const quoteItems = await client.query<any>("SELECT * FROM quotation_items WHERE quotation_revision_id = $1 ORDER BY line_no FOR UPDATE", [quote.current_revision_id]);
      const used = await client.query<{ source_quotation_item_id: string }>(`SELECT DISTINCT ii.source_quotation_item_id
        FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
        WHERE i.source_quotation_id = $1 AND i.status = 'issued' AND ii.source_quotation_item_id IS NOT NULL`, [quotationId]);
      const usedIds = new Set(used.rows.map((row) => row.source_quotation_item_id));
      const selectedIds = [...new Set(requested.data.itemIds)];
      const selected = quoteItems.rows.filter((row) => selectedIds.includes(row.id));
      if (selected.length !== selectedIds.length) throw new Error("พบรายการสินค้าที่ไม่อยู่ในใบเสนอราคา");
      if (selected.some((row) => usedIds.has(row.id))) throw new Error("มีรายการสินค้าที่ถูกออกใบแจ้งหนี้ไปแล้ว");
      if (selected.length === 0) throw new Error("กรุณาเลือกรายการสินค้าอย่างน้อยหนึ่งรายการ");
      const sum = (field: string) => selected.reduce((total, row) => total.plus(new Decimal(row[field] ?? 0)), new Decimal(0)).toDecimalPlaces(2).toFixed(2);
      const subtotal = selected.reduce((total, row) => total.plus(new Decimal(row.unit_price_ex_vat).mul(row.quantity)), new Decimal(0)).toDecimalPlaces(2).toFixed(2);
      const lineDiscountTotal = sum("line_discount_amount");
      const documentDiscountAmount = sum("document_discount_allocated");
      const taxableAmount = sum("net_amount");
      const vatAmount = sum("vat_amount");
      const grandTotal = sum("total_amount");
      const estimatedWht = new Decimal(taxableAmount).mul(rate).div(100).toDecimalPlaces(2).toFixed(2);
      const receivable = new Decimal(grandTotal).minus(estimatedWht).toDecimalPlaces(2).toFixed(2);
      const sequence = await client.query<{ reserve_document_number: string }>("SELECT reserve_document_number('invoice')::text");
      const number = sequence.rows[0]?.reserve_document_number;
      const invoice = await client.query<{ id: string }>(`INSERT INTO invoices(invoice_no,customer_id,source_quotation_id,source_quotation_revision_id,document_date,due_date,seller_snapshot,customer_snapshot,payment_terms,tax_mode,subtotal,line_discount_total,document_discount_amount,taxable_amount,vat_amount,grand_total,estimated_wht_amount,estimated_receivable,wht_rate,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'per_line',$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id`,
        [`IN-${String(number).padStart(6, "0")}`, quote.customer_id, quotationId, quote.current_revision_id, quote.document_date, quote.valid_until, quote.seller_snapshot, quote.customer_snapshot, quote.payment_terms, subtotal, lineDiscountTotal, documentDiscountAmount, taxableAmount, vatAmount, grandTotal, estimatedWht, receivable, rate.toFixed(4), user.id]);
      const id = invoice.rows[0]?.id;
      if (!id) throw new Error("ไม่สามารถออกใบแจ้งหนี้ได้");
      for (const [index, row] of selected.entries()) {
        await client.query(`INSERT INTO invoice_items(invoice_id,line_no,source_quotation_item_id,product_id,product_code_snapshot,name_snapshot,description_snapshot,unit_snapshot,quantity,unit_price_ex_vat,input_tax_basis,input_unit_price,line_discount_amount,document_discount_allocated,tax_code,vat_rate,net_amount,vat_amount,total_amount,wht_rate,wht_base_amount)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
          [id, index + 1, row.id, row.product_id, row.product_code_snapshot, row.name_snapshot, row.description_snapshot, row.unit_snapshot, row.quantity, row.unit_price_ex_vat, row.input_tax_basis, row.input_unit_price, row.line_discount_amount, row.document_discount_allocated, row.tax_code, row.vat_rate, row.net_amount, row.vat_amount, row.total_amount, rate.toFixed(4), row.net_amount]);
      }
      await client.query("INSERT INTO document_events(invoice_id,event_type,actor_id) VALUES($1,'issued',$2)", [id, user.id]);
      return id;
    });
    revalidatePath(`/invoices/${invoiceId}`); revalidatePath("/invoices");
    return { ok: true, id: invoiceId, message: "ออกใบแจ้งหนี้แล้ว" };
  } catch (error) { return { ok: false, error: safeError(error, "ไม่สามารถออกใบแจ้งหนี้ได้") }; }
}

function readInvoiceMeta(formData: FormData) {
  const parsed = invoiceMetaSchema.safeParse({
    invoiceNo: String(formData.get("invoiceNo") ?? ""),
    documentTitle: String(formData.get("documentTitle") ?? "ใบแจ้งหนี้"),
    documentDate: String(formData.get("documentDate") ?? ""),
    dueDate: String(formData.get("dueDate") ?? "") || undefined,
  });
  if (!parsed.success) throw parsed.error;
  return parsed.data;
}

export async function updateInvoiceMeta(invoiceId: string, formData: FormData): Promise<ActionResult> {
  const user = await requireUser(["admin", "manager", "accounting"]);
  if (!canIssueInvoice(user) || !uuid.safeParse(invoiceId).success) return { ok: false, error: "ไม่สามารถแก้ไขใบแจ้งหนี้นี้ได้" };
  try {
    const input = readInvoiceMeta(formData);
    await transaction(async (client) => {
      const result = await client.query<{ status: string; confirmed_at: string | null }>("SELECT status, confirmed_at FROM invoices WHERE id = $1 FOR UPDATE", [invoiceId]);
      const invoice = result.rows[0];
      if (!invoice) throw new Error("ไม่พบใบแจ้งหนี้");
      if (invoice.status !== "issued" || invoice.confirmed_at) throw new Error("ใบแจ้งหนี้นี้ยืนยันแล้ว จึงแก้ไขไม่ได้");
      await client.query(
        `UPDATE invoices SET invoice_no=$2, document_title=$3, document_date=$4, due_date=$5, updated_at=now()
          WHERE id=$1 AND status='issued' AND confirmed_at IS NULL`,
        [invoiceId, input.invoiceNo, input.documentTitle, input.documentDate, input.dueDate ?? null],
      );
      await client.query("INSERT INTO document_events(invoice_id,event_type,actor_id,reason) VALUES($1,'updated',$2,'แก้ไขข้อมูลใบแจ้งหนี้ก่อนยืนยัน')", [invoiceId, user.id]);
    });
    revalidatePath(`/invoices/${invoiceId}`); revalidatePath(`/invoices/${invoiceId}/print`); revalidatePath("/invoices"); revalidatePath("/billing-notes");
    return { ok: true, id: invoiceId, message: "บันทึกข้อมูลใบแจ้งหนี้แล้ว" };
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, error: "ข้อมูลใบแจ้งหนี้ไม่ถูกต้อง", fieldErrors: error.flatten().fieldErrors as Record<string, string[]> };
    return { ok: false, error: safeError(error, "ไม่สามารถแก้ไขใบแจ้งหนี้ได้") };
  }
}

export async function confirmInvoice(invoiceId: string): Promise<ActionResult> {
  const user = await requireUser(["admin", "manager", "accounting"]);
  if (!canIssueInvoice(user) || !uuid.safeParse(invoiceId).success) return { ok: false, error: "ไม่สามารถยืนยันใบแจ้งหนี้นี้ได้" };
  try {
    await transaction(async (client) => {
      const result = await client.query<{ status: string; confirmed_at: string | null }>("SELECT status, confirmed_at FROM invoices WHERE id = $1 FOR UPDATE", [invoiceId]);
      const invoice = result.rows[0];
      if (!invoice) throw new Error("ไม่พบใบแจ้งหนี้");
      if (invoice.status !== "issued") throw new Error("ยืนยันได้เฉพาะใบแจ้งหนี้ที่ยังใช้งานอยู่");
      if (invoice.confirmed_at) throw new Error("ใบแจ้งหนี้นี้ยืนยันแล้ว");
      await client.query("UPDATE invoices SET confirmed_at=now(), updated_at=now() WHERE id=$1 AND confirmed_at IS NULL", [invoiceId]);
      await client.query("INSERT INTO document_events(invoice_id,event_type,actor_id,reason) VALUES($1,'confirmed',$2,'ยืนยันใบแจ้งหนี้')", [invoiceId, user.id]);
    });
    revalidatePath(`/invoices/${invoiceId}`); revalidatePath(`/invoices/${invoiceId}/print`); revalidatePath("/invoices"); revalidatePath("/billing-notes");
    return { ok: true, id: invoiceId, message: "ยืนยันใบแจ้งหนี้แล้ว" };
  } catch (error) { return { ok: false, error: safeError(error, "ไม่สามารถยืนยันใบแจ้งหนี้ได้") }; }
}

export async function createBillingNote(invoiceIds: string[]): Promise<ActionResult> {
  const user = await requireUser(["admin", "manager", "accounting"]);
  if (!canManageBillingNote(user) || !Array.isArray(invoiceIds) || invoiceIds.length === 0) return { ok: false, error: "กรุณาเลือกใบแจ้งหนี้อย่างน้อยหนึ่งใบ" };
  const ids = [...new Set(invoiceIds)].filter((id) => uuid.safeParse(id).success).sort();
  if (ids.length !== invoiceIds.length) return { ok: false, error: "มีรหัสใบแจ้งหนี้ไม่ถูกต้อง" };
  try {
    const noteId = await transaction(async (client) => {
      const invoices = await client.query<any>(`SELECT i.*, c.legal_name, c.tax_id, c.branch_name, c.address FROM invoices i JOIN customers c ON c.id = i.customer_id WHERE i.id = ANY($1::uuid[]) ORDER BY i.id FOR UPDATE`, [ids]);
      if (invoices.rows.length !== ids.length) throw new Error("พบใบแจ้งหนี้ที่ไม่สามารถใช้วางบิลได้");
      if (invoices.rows.some((i) => i.status !== "issued" || !i.confirmed_at)) throw new Error("เลือกได้เฉพาะใบแจ้งหนี้ที่ยืนยันแล้ว");
      if (new Set(invoices.rows.map((i) => i.customer_id)).size !== 1) throw new Error("ใบวางบิลต้องเป็นของลูกค้ารายเดียวกัน");
      const allocated = await client.query("SELECT 1 FROM billing_note_items WHERE invoice_id = ANY($1::uuid[]) AND released_at IS NULL LIMIT 1", [ids]);
      if (allocated.rows[0]) throw new Error("มีใบแจ้งหนี้บางรายการอยู่ในใบวางบิลที่ยังมีผลแล้ว");
      const sequence = await client.query<{ reserve_document_number: string }>("SELECT reserve_document_number('billing_note')::text");
      const number = sequence.rows[0]?.reserve_document_number;
      const first = invoices.rows[0];
      const total = invoices.rows.reduce((sum: number, i: any) => sum + Number(i.grand_total), 0).toFixed(2);
      const note = await client.query<{ id: string }>(`INSERT INTO billing_notes(billing_note_no,customer_id,seller_snapshot,customer_snapshot,total_amount,status,issued_at,created_by) VALUES($1,$2,$3,$4,$5,'issued',now(),$6) RETURNING id`,
        [`BN-${String(number).padStart(6, "0")}`, first.customer_id, first.seller_snapshot, { schema_version: 1, legal_name: first.legal_name, tax_id: first.tax_id ?? "", branch_name: first.branch_name, address: first.address }, total, user.id]);
      const id = note.rows[0]?.id;
      if (!id) throw new Error("ไม่สามารถสร้างใบวางบิลได้");
      for (const [index, invoice] of invoices.rows.entries()) await client.query(`INSERT INTO billing_note_items(billing_note_id,invoice_id,line_no,invoice_no_snapshot,invoice_date_snapshot,due_date_snapshot,outstanding_at_issue,billed_amount) VALUES($1,$2,$3,$4,$5,$6,$7,$7)`, [id, invoice.id, index + 1, invoice.invoice_no, invoice.document_date, invoice.due_date, invoice.grand_total]);
      await client.query("INSERT INTO document_events(billing_note_id,event_type,actor_id) VALUES($1,'issued',$2)", [id, user.id]);
      return id;
    });
    revalidatePath(`/billing-notes/${noteId}`); revalidatePath("/billing-notes");
    return { ok: true, id: noteId, message: "สร้างใบวางบิลแล้ว" };
  } catch (error) { return { ok: false, error: safeError(error, "ไม่สามารถสร้างใบวางบิลได้") }; }
}

export async function cancelBillingNote(noteId: string): Promise<ActionResult> {
  const user = await requireUser(["admin", "manager", "accounting"]);
  if (!canManageBillingNote(user) || !uuid.safeParse(noteId).success) return { ok: false, error: "ไม่สามารถยกเลิกใบวางบิลนี้ได้" };
  try {
    await transaction(async (client) => {
      const note = await client.query<{ status: string }>("SELECT status FROM billing_notes WHERE id = $1 FOR UPDATE", [noteId]);
      if (!note.rows[0] || note.rows[0].status === "cancelled") throw new Error("ใบวางบิลนี้ถูกยกเลิกแล้ว");
      await client.query("UPDATE billing_notes SET status='cancelled', cancelled_at=now(), cancellation_reason='ยกเลิกโดยผู้ใช้', updated_at=now() WHERE id=$1", [noteId]);
      await client.query("UPDATE billing_note_items SET released_at=now(), release_reason='billing note cancelled' WHERE billing_note_id=$1 AND released_at IS NULL", [noteId]);
      await client.query("INSERT INTO document_events(billing_note_id,event_type,actor_id,reason) VALUES($1,'cancelled',$2,'ยกเลิกใบวางบิล')", [noteId, user.id]);
    });
    revalidatePath(`/billing-notes/${noteId}`); revalidatePath("/billing-notes");
    return { ok: true, id: noteId, message: "ยกเลิกใบวางบิลแล้ว" };
  } catch (error) { return { ok: false, error: safeError(error, "ไม่สามารถยกเลิกใบวางบิลได้") }; }
}


