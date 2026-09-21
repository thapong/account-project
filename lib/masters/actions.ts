"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query, transaction } from "@/lib/db";
import type { MasterActionState } from "./types";
import {
  customerSchema,
  formObject,
  priceListItemSchema,
  priceListSchema,
  productSchema,
  uuidSchema,
  validationState,
} from "./validation";

function safeDatabaseMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505") {
    return "รหัสนี้มีอยู่แล้ว กรุณาใช้รหัสอื่น";
  }
  return "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง";
}

async function requireMasterManager() {
  return requireUser(["admin", "manager"]);
}

async function requireCustomerEditor() {
  return requireUser(["admin", "manager", "sales"]);
}

export async function createCustomerAction(_previous: MasterActionState, formData: FormData): Promise<MasterActionState> {
  const user = await requireCustomerEditor();
  const parsed = customerSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationState(parsed.error);
  const v = parsed.data;
  let customerId = "";
  try {
    const rows = await query<{ id: string }>(
      `INSERT INTO customers
        (customer_code, legal_name, tax_id, branch_name, address, contact_name, contact_phone, contact_email,
         credit_days, billing_schedule, payment_schedule, notes, created_by)
       VALUES ($1,$2,NULLIF($3,''),$4,$5,$6,$7,$8,NULLIF($9,'')::integer,$10,$11,$12,$13)
       RETURNING id`,
      [v.customerCode, v.legalName, v.taxId ?? "", v.branchName, v.address ?? "", v.contactName ?? "", v.contactPhone ?? "", v.contactEmail ?? "", String(v.creditDays ?? ""), v.billingSchedule ?? "", v.paymentSchedule ?? "", v.notes ?? "", user.id],
    );
    customerId = rows[0].id;
  } catch (error) {
    return { message: safeDatabaseMessage(error) };
  }
  revalidatePath("/customers");
  redirect(`/customers/${customerId}/edit`);
}

export async function updateCustomerAction(id: string, _previous: MasterActionState, formData: FormData): Promise<MasterActionState> {
  await requireCustomerEditor();
  const idResult = uuidSchema.safeParse(id);
  if (!idResult.success) return { message: "ไม่พบลูกค้าที่ต้องการแก้ไข" };
  const parsed = customerSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationState(parsed.error);
  const v = parsed.data;
  try {
    const result = await query<{ id: string }>(
      `UPDATE customers SET customer_code=$1, legal_name=$2, tax_id=NULLIF($3,''), branch_name=$4, address=$5,
          contact_name=$6, contact_phone=$7, contact_email=$8, credit_days=NULLIF($9,'')::integer,
          billing_schedule=$10, payment_schedule=$11, notes=$12, updated_at=now() WHERE id=$13 RETURNING id`,
      [v.customerCode, v.legalName, v.taxId ?? "", v.branchName, v.address ?? "", v.contactName ?? "", v.contactPhone ?? "", v.contactEmail ?? "", String(v.creditDays ?? ""), v.billingSchedule ?? "", v.paymentSchedule ?? "", v.notes ?? "", id],
    );
    if (!result[0]) return { message: "ไม่พบลูกค้าที่ต้องการแก้ไข" };
    revalidatePath("/customers");
    revalidatePath(`/customers/${id}/edit`);
    return { ok: true, message: "บันทึกข้อมูลลูกค้าแล้ว" };
  } catch (error) {
    return { message: safeDatabaseMessage(error) };
  }
}

export async function toggleCustomerAction(id: string): Promise<MasterActionState> {
  await requireCustomerEditor();
  if (!uuidSchema.safeParse(id).success) return { message: "รายการลูกค้าไม่ถูกต้อง" };
  try {
    await query(`UPDATE customers SET is_active = NOT is_active, updated_at=now() WHERE id=$1`, [id]);
    revalidatePath("/customers");
    return { ok: true };
  } catch {
    return { message: "ไม่สามารถเปลี่ยนสถานะลูกค้าได้" };
  }
}

export async function createProductAction(_previous: MasterActionState, formData: FormData): Promise<MasterActionState> {
  await requireMasterManager();
  const parsed = productSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationState(parsed.error);
  const v = parsed.data;
  let productId = "";
  try {
    const rows = await query<{ id: string }>(
      `INSERT INTO products (product_code, model, vendor_part, name, description, kind, category, unit, warranty)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [v.productCode, v.model ?? "", v.vendorPart ?? "", v.name, v.description ?? "", v.kind, v.category ?? "", v.unit, v.warranty ?? ""],
    );
    productId = rows[0].id;
  } catch (error) {
    return { message: safeDatabaseMessage(error) };
  }
  revalidatePath("/products");
  redirect(`/products/${productId}/edit`);
}

export async function updateProductAction(id: string, _previous: MasterActionState, formData: FormData): Promise<MasterActionState> {
  await requireMasterManager();
  if (!uuidSchema.safeParse(id).success) return { message: "ไม่พบสินค้าที่ต้องการแก้ไข" };
  const parsed = productSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationState(parsed.error);
  const v = parsed.data;
  try {
    const result = await query<{ id: string }>(
      `UPDATE products SET product_code=$1, model=$2, vendor_part=$3, name=$4, description=$5, kind=$6,
          category=$7, unit=$8, warranty=$9, updated_at=now() WHERE id=$10 RETURNING id`,
      [v.productCode, v.model ?? "", v.vendorPart ?? "", v.name, v.description ?? "", v.kind, v.category ?? "", v.unit, v.warranty ?? "", id],
    );
    if (!result[0]) return { message: "ไม่พบสินค้าที่ต้องการแก้ไข" };
    revalidatePath("/products");
    revalidatePath(`/products/${id}/edit`);
    return { ok: true, message: "บันทึกข้อมูลสินค้าแล้ว" };
  } catch (error) {
    return { message: safeDatabaseMessage(error) };
  }
}

export async function toggleProductAction(id: string): Promise<MasterActionState> {
  await requireMasterManager();
  if (!uuidSchema.safeParse(id).success) return { message: "รายการสินค้าไม่ถูกต้อง" };
  try {
    await query(`UPDATE products SET is_active = NOT is_active, updated_at=now() WHERE id=$1`, [id]);
    revalidatePath("/products");
    return { ok: true };
  } catch {
    return { message: "ไม่สามารถเปลี่ยนสถานะสินค้าได้" };
  }
}

export async function createPriceListAction(_previous: MasterActionState, formData: FormData): Promise<MasterActionState> {
  const user = await requireMasterManager();
  const parsed = priceListSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationState(parsed.error);
  const v = parsed.data;
  if (v.validTo && v.validTo < v.validFrom) return { fieldErrors: { validTo: ["วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น"] }, message: "กรุณาตรวจสอบช่วงวันที่" };
  let priceListId = "";
  try {
    const rows = await query<{ id: string }>(
      `INSERT INTO price_lists (code, name, version, valid_from, valid_to, status, currency, created_by)
       VALUES ($1,$2,1,$3,NULLIF($4,'')::date,'draft','THB',$5) RETURNING id`,
      [v.code, v.name, v.validFrom, v.validTo ?? "", user.id],
    );
    priceListId = rows[0].id;
  } catch (error) {
    return { message: safeDatabaseMessage(error) };
  }
  revalidatePath("/price-lists");
  redirect(`/price-lists/${priceListId}`);
}

export async function addPriceListItemAction(_previous: MasterActionState, formData: FormData): Promise<MasterActionState> {
  await requireMasterManager();
  const parsed = priceListItemSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationState(parsed.error);
  const v = parsed.data;
  try {
    await transaction(async (client) => {
      const list = await client.query<{ status: string }>(`SELECT status FROM price_lists WHERE id=$1 FOR UPDATE`, [v.priceListId]);
      if (!list.rows[0] || list.rows[0].status !== "draft") throw new Error("immutable");
      await client.query(
        `INSERT INTO price_list_items (price_list_id, product_id, selling_price, tax_basis, vat_rate, cost_price, srp_price)
         VALUES ($1,$2,$3,$4,$5,NULLIF($6,'')::numeric,NULLIF($7,'')::numeric)
         ON CONFLICT (price_list_id, product_id) DO UPDATE SET selling_price=EXCLUDED.selling_price,
           tax_basis=EXCLUDED.tax_basis, vat_rate=EXCLUDED.vat_rate, cost_price=EXCLUDED.cost_price,
           srp_price=EXCLUDED.srp_price, updated_at=now()`,
        [v.priceListId, v.productId, v.sellingPrice, v.taxBasis, v.vatRate, v.costPrice ?? "", v.srpPrice ?? ""],
      );
    });
    revalidatePath(`/price-lists/${v.priceListId}`);
    return { ok: true, message: "เพิ่มรายการราคาแล้ว" };
  } catch (error) {
    return { message: error instanceof Error && error.message === "immutable" ? "เผยแพร่แล้ว จึงแก้ไขรายการไม่ได้" : safeDatabaseMessage(error) };
  }
}

export async function publishPriceListAction(id: string): Promise<MasterActionState> {
  await requireMasterManager();
  if (!uuidSchema.safeParse(id).success) return { message: "รายการราคาไม่ถูกต้อง" };
  try {
    await transaction(async (client) => {
      const list = await client.query<{ status: string }>(`SELECT status FROM price_lists WHERE id=$1 FOR UPDATE`, [id]);
      if (!list.rows[0]) throw new Error("missing");
      if (list.rows[0].status !== "draft") throw new Error("immutable");
      const count = await client.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM price_list_items WHERE price_list_id=$1`, [id]);
      if (count.rows[0].count === "0") throw new Error("empty");
      await client.query(`UPDATE price_lists SET status='published', updated_at=now() WHERE id=$1`, [id]);
    });
    revalidatePath("/price-lists");
    revalidatePath(`/price-lists/${id}`);
    return { ok: true, message: "เผยแพร่รายการราคาแล้ว" };
  } catch (error) {
    const message = error instanceof Error && error.message === "empty" ? "ต้องมีสินค้าอย่างน้อย 1 รายการก่อนเผยแพร่" : error instanceof Error && error.message === "immutable" ? "รายการราคานี้ถูกเผยแพร่หรือเลิกใช้แล้ว" : "ไม่สามารถเผยแพร่รายการราคาได้";
    return { message };
  }
}

export async function retirePriceListAction(id: string): Promise<MasterActionState> {
  await requireMasterManager();
  if (!uuidSchema.safeParse(id).success) return { message: "รายการราคาไม่ถูกต้อง" };
  const result = await query<{ id: string }>(`UPDATE price_lists SET status='retired', updated_at=now() WHERE id=$1 AND status='published' RETURNING id`, [id]);
  if (!result[0]) return { message: "เลิกใช้ได้เฉพาะรายการราคาที่เผยแพร่แล้ว" };
  revalidatePath("/price-lists");
  revalidatePath(`/price-lists/${id}`);
  return { ok: true, message: "เลิกใช้รายการราคาแล้ว" };
}

export async function clonePriceListAction(id: string, _previous: MasterActionState, formData: FormData): Promise<MasterActionState> {
  const user = await requireMasterManager();
  if (!uuidSchema.safeParse(id).success) return { message: "รายการราคาไม่ถูกต้อง" };
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const validFrom = String(formData.get("validFrom") ?? "").trim();
  const parsed = priceListSchema.safeParse({ code, name, validFrom, validTo: String(formData.get("validTo") ?? "") });
  if (!parsed.success) return validationState(parsed.error);
  let createdId = "";
  try {
    const rows = await transaction(async (client) => {
      const source = await client.query<{ name: string; version: number }>(`SELECT name, version FROM price_lists WHERE id=$1`, [id]);
      if (!source.rows[0]) throw new Error("missing");
      const created = await client.query<{ id: string }>(
        `INSERT INTO price_lists (code,name,version,valid_from,valid_to,status,currency,created_by)
         VALUES ($1,$2,$3,$4,NULLIF($5,'')::date,'draft','THB',$6) RETURNING id`,
        [parsed.data.code, parsed.data.name, source.rows[0].version + 1, parsed.data.validFrom, parsed.data.validTo ?? "", user.id],
      );
      await client.query(
        `INSERT INTO price_list_items (price_list_id, product_id, selling_price, tax_basis, vat_rate, cost_price, srp_price)
         SELECT $1, product_id, selling_price, tax_basis, vat_rate, cost_price, srp_price FROM price_list_items WHERE price_list_id=$2`,
        [created.rows[0].id, id],
      );
      return created.rows[0];
    });
    createdId = rows.id;
  } catch (error) {
    return { message: error instanceof Error && error.message === "missing" ? "ไม่พบรายการราคาต้นฉบับ" : safeDatabaseMessage(error) };
  }
  revalidatePath("/price-lists");
  redirect(`/price-lists/${createdId}`);
}
