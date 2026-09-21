import { z } from "zod";

export const uuidSchema = z.string().uuid("รหัสรายการไม่ถูกต้อง");

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const customerSchema = z.object({
  customerCode: z.string().trim().min(1, "กรุณาระบุรหัสลูกค้า").max(80),
  legalName: z.string().trim().min(1, "กรุณาระบุชื่อลูกค้า").max(240),
  taxId: optionalText(40),
  branchName: z.string().trim().min(1, "กรุณาระบุสาขา").max(160),
  address: optionalText(1000),
  contactName: optionalText(160),
  contactPhone: optionalText(80),
  contactEmail: z.string().trim().email("อีเมลไม่ถูกต้อง").max(240).optional().or(z.literal("")),
  creditDays: z.coerce.number().int().min(0, "เครดิตต้องไม่ติดลบ").max(3650).optional().or(z.literal("")),
  billingSchedule: optionalText(160),
  paymentSchedule: optionalText(160),
  notes: optionalText(2000),
});

export const productSchema = z.object({
  productCode: z.string().trim().min(1, "กรุณาระบุรหัสสินค้า").max(80),
  model: optionalText(160),
  vendorPart: optionalText(160),
  name: z.string().trim().min(1, "กรุณาระบุชื่อสินค้า").max(240),
  description: optionalText(2000),
  kind: z.enum(["hardware", "service", "subscription"]),
  category: optionalText(160),
  unit: z.string().trim().min(1, "กรุณาระบุหน่วย").max(60),
  warranty: optionalText(240),
});

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ไม่ถูกต้อง");

export const priceListSchema = z.object({
  code: z.string().trim().min(1, "กรุณาระบุรหัสรายการราคา").max(80),
  name: z.string().trim().min(1, "กรุณาระบุชื่อรายการราคา").max(240),
  validFrom: dateSchema,
  validTo: z.union([dateSchema, z.literal("")]).optional(),
});

export const priceListItemSchema = z.object({
  priceListId: uuidSchema,
  productId: uuidSchema,
  sellingPrice: z.string().trim().regex(/^\d+(\.\d{1,6})?$/, "ราคาขายต้องเป็นตัวเลขไม่ติดลบ").refine((v) => Number(v) < 1_000_000_000_000, "ราคาสูงเกินกำหนด"),
  taxBasis: z.enum(["exclusive", "inclusive"]),
  vatRate: z.string().trim().regex(/^\d+(\.\d{1,4})?$/, "อัตรา VAT ไม่ถูกต้อง").refine((v) => Number(v) <= 100, "อัตรา VAT ต้องไม่เกิน 100"),
  costPrice: z.union([z.string().trim().regex(/^\d+(\.\d{1,6})?$/), z.literal("")]).optional(),
  srpPrice: z.union([z.string().trim().regex(/^\d+(\.\d{1,6})?$/), z.literal("")]).optional(),
});

export function formObject(formData: FormData): Record<string, string> {
  return Object.fromEntries(Array.from(formData.entries()).map(([key, value]) => [key, typeof value === "string" ? value : ""]));
}

export function validationState(error: z.ZodError): { fieldErrors: Record<string, string[]>; message: string } {
  return { fieldErrors: error.flatten().fieldErrors as Record<string, string[]>, message: "กรุณาตรวจสอบข้อมูลในฟอร์ม" };
}
