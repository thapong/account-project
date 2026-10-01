"use server";

import { createReceipt as createReceiptRecord } from "@/lib/receipts";

export async function createReceipt(form: FormData) {
  return createReceiptRecord(form);
}
