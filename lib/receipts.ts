/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { requireUser } from "@/lib/auth";
import { query, transaction } from "@/lib/db";
import { z } from "zod";

const uuid = z.string().uuid();
const paymentSchema = z.array(z.object({
  paymentMethod: z.enum(["cash", "bank_transfer", "cheque"]),
  amount: z.number().finite().positive().refine((amount) => Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})).min(1).max(10);
const allowedEvidenceTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const maxEvidenceBytes = 4 * 1024 * 1024;

export async function listReceipts(options: { page?: number; pageSize?: number } = {}) {
  await requireUser(["admin", "manager", "accounting"]);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
  const page = Math.max(1, options.page ?? 1);
  const offset = (page - 1) * pageSize;
  const [rows, count] = await Promise.all([
    query<any>(`SELECT r.id,r.receipt_no,r.invoice_id,r.billing_note_id,r.customer_id,r.receipt_date::text AS receipt_date_text,r.amount,r.internal_note,r.customer_snapshot->>'legal_name' AS customer_name,i.invoice_no,b.billing_note_no FROM receipts r LEFT JOIN invoices i ON i.id=r.invoice_id LEFT JOIN billing_notes b ON b.id=r.billing_note_id ORDER BY r.receipt_date DESC,r.receipt_no DESC LIMIT $1 OFFSET $2`, [pageSize, offset]),
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM receipts`),
  ]);
  return { rows, total: Number(count[0]?.count ?? 0), page, pageSize };
}

export async function getReceipt(id: string) {
  await requireUser(["admin", "manager", "accounting"]);
  if (!uuid.safeParse(id).success) return null;
  const rows = await query<any>(`SELECT r.id,r.receipt_no,r.invoice_id,r.billing_note_id,r.customer_id,r.receipt_date::text AS receipt_date_text,r.amount,r.internal_note,r.seller_snapshot,r.customer_snapshot,r.created_by,r.created_at,i.invoice_no,b.billing_note_no,COALESCE((SELECT json_agg(json_build_object('id',p.id,'line_no',p.line_no,'payment_method',p.payment_method,'bank_account_snapshot',p.bank_account_snapshot,'amount',p.amount,'payment_date',p.payment_date::text,'evidence_filename',p.evidence_filename) ORDER BY p.line_no) FROM receipt_payment_details p WHERE p.receipt_id=r.id),'[]'::json) AS payments FROM receipts r LEFT JOIN invoices i ON i.id=r.invoice_id LEFT JOIN billing_notes b ON b.id=r.billing_note_id WHERE r.id=$1`, [id]);
  return rows[0] ?? null;
}

export async function createReceipt(form: FormData): Promise<{ ok: boolean; id?: string; error?: string }> {
  const user = await requireUser(["admin", "manager", "accounting"]);
  const sourceType = form.get("sourceType");
  const sourceId = form.get("sourceId");
  const internalNote = String(form.get("internalNote") ?? "").trim();
  if ((sourceType !== "invoice" && sourceType !== "billing_note") || typeof sourceId !== "string" || !uuid.safeParse(sourceId).success) return { ok: false, error: "กรุณาเลือกเอกสารต้นทางให้ถูกต้อง" };
  if (internalNote.length > 2000) return { ok: false, error: "หมายเหตุภายในต้องไม่เกิน 2,000 ตัวอักษร" };

  let payments: z.infer<typeof paymentSchema>;
  try {
    const raw = JSON.parse(String(form.get("payments") ?? ""));
    const parsed = paymentSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "กรุณากรอกรูปแบบ ยอดเงิน และวันที่ของรายการชำระให้ครบ" };
    payments = parsed.data;
  } catch {
    return { ok: false, error: "กรุณากรอกรายละเอียดการชำระเงิน" };
  }
  for (const payment of payments) {
    const date = new Date(`${payment.paymentDate}T00:00:00Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== payment.paymentDate) return { ok: false, error: "วันที่รับเงินไม่ถูกต้อง" };
  }

  const evidenceFiles: ({ bytes: Buffer; filename: string; mimeType: string } | null)[] = [];
  let totalEvidenceBytes = 0;
  for (let index = 0; index < payments.length; index += 1) {
    const file = form.get(`evidence-${index}`);
    if (typeof File === "undefined" || !(file instanceof File) || file.size === 0) { evidenceFiles.push(null); continue; }
    totalEvidenceBytes += file.size;
    if (totalEvidenceBytes > maxEvidenceBytes) return { ok: false, error: "ไฟล์หลักฐานรวมกันต้องมีขนาดไม่เกิน 4 MB" };
    if (!allowedEvidenceTypes.has(file.type)) return { ok: false, error: "รองรับไฟล์ PDF, JPG และ PNG เท่านั้น" };
    evidenceFiles.push({ bytes: Buffer.from(await file.arrayBuffer()), filename: file.name.replace(/[\\/\r\n\0]/g, "_").slice(0, 255), mimeType: file.type });
  }

  const totalAmount = Math.round(payments.reduce((sum, payment) => sum + payment.amount, 0) * 100) / 100;
  try {
    const id = await transaction(async (client) => {
      const isInvoice = sourceType === "invoice";
      const source = isInvoice
        ? await client.query<any>(`SELECT id,customer_id,estimated_receivable AS amount,seller_snapshot,customer_snapshot,status FROM invoices WHERE id=$1 FOR UPDATE`, [sourceId])
        : await client.query<any>(`SELECT id,customer_id,total_amount AS amount,seller_snapshot,customer_snapshot,status FROM billing_notes WHERE id=$1 FOR UPDATE`, [sourceId]);
      const row = source.rows[0];
      if (!row || row.status !== "issued") throw new Error("เอกสารต้องอยู่ในสถานะออกแล้ว");
      const paid = await client.query<{ amount: string }>(`SELECT COALESCE(sum(amount),0)::text AS amount FROM receipts WHERE ${isInvoice ? "invoice_id" : "billing_note_id"}=$1`, [sourceId]);
      const remaining = Math.max(0, Number(row.amount) - Number(paid.rows[0]?.amount ?? 0));
      if (remaining <= 0) throw new Error("เอกสารนี้ชำระครบและออกใบเสร็จครบแล้ว");
      if (totalAmount > remaining + 0.005) throw new Error(`ยอดรวมที่รับชำระต้องไม่เกินยอดคงเหลือ ${remaining.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท`);

      let bankAccountSnapshot: { bank_name: string; bank_branch: string; bank_account_no: string } | null = null;
      if (payments.some((payment) => payment.paymentMethod === "bank_transfer")) {
        const result = await client.query<{ bank_name: string; bank_branch: string; bank_account_no: string }>("SELECT bank_name,bank_branch,bank_account_no FROM company_settings WHERE id=true");
        const bank = result.rows[0];
        if (!bank || !bank.bank_name || !bank.bank_account_no) throw new Error("กรุณากรอกข้อมูลบัญชีธนาคารของบริษัทก่อนเลือกโอนเงิน");
        bankAccountSnapshot = bank;
      }

      const sequence = await client.query<{ next_number: number }>(`UPDATE receipt_sequences SET next_number=next_number+1 WHERE sequence_key='receipt' RETURNING next_number-1 AS next_number`);
      if (!sequence.rows[0]) throw new Error("ไม่พบชุดเลขที่ใบเสร็จ");
      const receiptNo = `RC-${String(sequence.rows[0].next_number).padStart(6, "0")}`;
      const inserted = await client.query<{ id: string }>(`INSERT INTO receipts(receipt_no,invoice_id,billing_note_id,customer_id,receipt_date,amount,internal_note,seller_snapshot,customer_snapshot,created_by) VALUES($1,$2,$3,$4,CURRENT_DATE,$5,$6,$7,$8,$9) RETURNING id`, [receiptNo, isInvoice ? sourceId : null, isInvoice ? null : sourceId, row.customer_id, totalAmount, internalNote, row.seller_snapshot, row.customer_snapshot, user.id]);
      const receiptId = inserted.rows[0].id;
      for (const [index, payment] of payments.entries()) {
        const evidence = evidenceFiles[index];
        await client.query(`INSERT INTO receipt_payment_details(receipt_id,line_no,payment_method,bank_account_snapshot,amount,payment_date,evidence_filename,evidence_mime_type,evidence_data) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [receiptId,index+1,payment.paymentMethod,payment.paymentMethod === "bank_transfer" ? bankAccountSnapshot : null,payment.amount,payment.paymentDate,evidence?.filename ?? null,evidence?.mimeType ?? null,evidence?.bytes ?? null]);
      }
      return receiptId;
    });
    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "สร้างใบเสร็จไม่สำเร็จ" };
  }
}
