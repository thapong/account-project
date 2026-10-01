/* eslint-disable @typescript-eslint/no-explicit-any */
import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { z } from "zod";
import { canReadInvoice, canReadOwnedDocument } from "./types";
import { pageCount, parsePagination, type PaginationInput } from "@/lib/pagination";

export type QuotationListRow = {
  id: string; quotation_no: string; customer_id: string; customer_name: string; owner_user_id: string;
  owner_name: string; status: string; document_date: string; valid_until: string | null; grand_total: string;
};

export async function listQuotations(input: PaginationInput = {}) {
  const user = await requireUser(["admin", "manager", "sales"]);
  const { page, pageSize, offset } = parsePagination(input);
  const [rows, totals] = await Promise.all([query<QuotationListRow>(`SELECT q.id, q.quotation_no, q.customer_id, c.legal_name AS customer_name,
          q.owner_user_id, u.display_name AS owner_name, q.status, r.document_date::text, r.valid_until::text,
          r.grand_total::text
        FROM quotations q JOIN customers c ON c.id = q.customer_id JOIN users u ON u.id = q.owner_user_id
        JOIN quotation_revisions r ON r.id = q.current_revision_id
       WHERE ($1 IN ('admin','manager') OR q.owner_user_id = $2)
       ORDER BY q.created_at DESC LIMIT $3 OFFSET $4`, [user.role, user.id, pageSize, offset]), query<{ total: string }>(
         `SELECT count(*)::text AS total FROM quotations q
           WHERE ($1 IN ('admin','manager') OR q.owner_user_id = $2)`, [user.role, user.id])]);
  const total = Number(totals[0]?.total ?? 0);
  return { user, rows, total, page, pageSize, pageCount: pageCount(total, pageSize) };
}

export async function getQuotation(id: string) {
  const user = await requireUser(["admin", "manager", "sales"]);
  if (!z.string().uuid().safeParse(id).success) return null;
  const rows = await query<any>(`SELECT q.id, q.quotation_no, q.customer_id, q.owner_user_id, q.status AS quote_status,
          q.current_revision_id, r.*, u.display_name AS owner_name
        FROM quotations q JOIN quotation_revisions r ON r.id = q.current_revision_id JOIN users u ON u.id = q.owner_user_id
       WHERE q.id = $1`, [id]);
  const quotation = rows[0] ? {
    ...rows[0],
    document_date: rows[0].document_date instanceof Date ? rows[0].document_date.toISOString().slice(0, 10) : rows[0].document_date,
    valid_until: rows[0].valid_until instanceof Date ? rows[0].valid_until.toISOString().slice(0, 10) : rows[0].valid_until,
  } : null;
  if (!quotation || !canReadOwnedDocument(user, quotation.owner_user_id)) return null;
  const lines = await query<any>(`SELECT qi.*, used.invoice_no AS source_invoice_no
    FROM quotation_items qi
    LEFT JOIN LATERAL (
      SELECT i.invoice_no FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
      WHERE ii.source_quotation_item_id = qi.id AND i.status = 'issued'
      ORDER BY i.created_at LIMIT 1
    ) used ON true
    WHERE qi.quotation_revision_id = $1 ORDER BY qi.line_no`, [quotation.current_revision_id]);
  const company = (await query<any>("SELECT legal_name,tax_id,address,phone,email,bank_name,bank_branch,bank_account_no FROM company_settings WHERE id=true"))[0] ?? null;
  return { user, quotation, lines, company };
}

export async function getInvoice(id: string) {
  const user = await requireUser(["admin", "manager", "accounting"]);
  if (!canReadInvoice(user)) return null;
  if (!z.string().uuid().safeParse(id).success) return null;
  const rows = await query<any>("SELECT * FROM invoices WHERE id = $1", [id]);
  const invoice = rows[0];
  if (!invoice) return null;
  const lines = await query<any>("SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY line_no", [id]);

  const company = (await query<any>("SELECT legal_name,tax_id,address,phone,email,bank_name,bank_branch,bank_account_no FROM company_settings WHERE id=true"))[0] ?? null;
  return { user, invoice, lines, company };
}

export async function getManualInvoiceFormOptions() {
  await requireUser(["admin", "manager", "accounting"]);
  const [customers, products] = await Promise.all([
    query<{ id: string; customer_code: string; legal_name: string; branch_name: string }>("SELECT id,customer_code,legal_name,branch_name FROM customers WHERE is_active=true ORDER BY legal_name"),
    query<{ id: string; product_code: string; name: string; unit: string; description: string; warranty: string }>("SELECT id,product_code,name,unit,description,warranty FROM products WHERE is_active=true ORDER BY name"),
  ]);
  return { customers, products };
}

export async function getBillingNote(id: string) {
  const user = await requireUser(["admin", "manager", "accounting"]);
  if (!canReadInvoice(user)) return null;
  if (!z.string().uuid().safeParse(id).success) return null;
  const rows = await query<any>("SELECT * FROM billing_notes WHERE id = $1", [id]);
  const note = rows[0];
  if (!note) return null;
  const lines = await query<any>(`SELECT bi.*, i.customer_id, i.grand_total, i.status AS invoice_status
    FROM billing_note_items bi JOIN invoices i ON i.id = bi.invoice_id WHERE bi.billing_note_id = $1 ORDER BY bi.line_no`, [id]);
  return { user, note, lines };
}

/** List billing notes so users can review previously issued or cancelled notes. */
export async function listBillingNotes(input: PaginationInput = {}) {
  const user = await requireUser(["admin", "manager", "accounting"]);
  const { page, pageSize, offset } = parsePagination(input);
  const [rows, totals] = await Promise.all([
    query<any>(`SELECT bn.id, bn.billing_note_no, bn.customer_id,
        bn.customer_snapshot->>'legal_name' AS customer_name,
        bn.document_date::text, bn.appointment_date::text,
        bn.total_amount::text, bn.status,
        (SELECT count(*)::int FROM billing_note_items bi WHERE bi.billing_note_id = bn.id) AS invoice_count
      FROM billing_notes bn
      ORDER BY bn.document_date DESC, bn.billing_note_no DESC
      LIMIT $1 OFFSET $2`, [pageSize, offset]),
    query<{ total: string }>("SELECT count(*)::text AS total FROM billing_notes"),
  ]);
  const total = Number(totals[0]?.total ?? 0);
  return { user, rows, total, page, pageSize, pageCount: pageCount(total, pageSize) };
}

export async function getQuotationFormOptions() {
  await requireUser(["admin", "manager", "sales"]);
  const [customers, products, prices] = await Promise.all([
    query<{ id: string; customer_code: string; legal_name: string; branch_name: string }>("SELECT id, customer_code, legal_name, branch_name FROM customers WHERE is_active = true ORDER BY legal_name"),
    query<{ id: string; product_code: string; name: string; unit: string; description: string; warranty: string }>("SELECT id, product_code, name, unit, description, warranty FROM products WHERE is_active = true ORDER BY name"),
    query<{ id: string; product_id: string; product_code: string; product_name: string; selling_price: string; tax_basis: "exclusive" | "inclusive"; vat_rate: string; list_name: string }>(`SELECT i.id, i.product_id, p.product_code, p.name AS product_name, i.selling_price::text,
        i.tax_basis, i.vat_rate::text, l.name AS list_name
        FROM price_list_items i JOIN price_lists l ON l.id = i.price_list_id JOIN products p ON p.id = i.product_id
       WHERE l.status = 'published' AND l.valid_from <= CURRENT_DATE AND (l.valid_to IS NULL OR l.valid_to >= CURRENT_DATE)
       ORDER BY p.name, l.name`),
  ]);
  return { customers, products, prices };
}

export async function listIssuedInvoicesForBilling(input: PaginationInput = {}) {
  const user = await requireUser(["admin", "manager", "accounting"]);
  const { page, pageSize, offset } = parsePagination(input);
  const baseWhere = `i.status = 'issued'
      AND i.confirmed_at IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM billing_note_items bi WHERE bi.invoice_id = i.id AND bi.released_at IS NULL)`;
  const [rows, totals] = await Promise.all([query<any>(`SELECT i.id, i.invoice_no, i.customer_id, i.customer_snapshot->>'legal_name' AS customer_name,
      i.document_date::text, i.due_date::text, i.grand_total::text
    FROM invoices i WHERE ${baseWhere}
    ORDER BY i.document_date DESC, i.invoice_no DESC LIMIT $1 OFFSET $2`, [pageSize, offset]), query<{ total: string }>(
      `SELECT count(*)::text AS total FROM invoices i WHERE ${baseWhere}`)]);
  const total = Number(totals[0]?.total ?? 0);
  return { user, rows, total, page, pageSize, pageCount: pageCount(total, pageSize) };
}

export async function listInvoices(input: PaginationInput = {}) {
  const user = await requireUser(["admin", "manager", "accounting"]);
  const { page, pageSize, offset } = parsePagination(input);
  const [rows, totals] = await Promise.all([query<{ id: string; invoice_no: string; customer_name: string; document_date: string; due_date: string | null; grand_total: string; status: string; document_title: string; confirmed_at: string | null }>(`SELECT i.id, i.invoice_no, i.customer_snapshot->>'legal_name' AS customer_name,
      i.document_date::text, i.due_date::text, i.grand_total::text, i.status, i.document_title, i.confirmed_at
    FROM invoices i ORDER BY i.document_date DESC, i.invoice_no DESC LIMIT $1 OFFSET $2`, [pageSize, offset]), query<{ total: string }>("SELECT count(*)::text AS total FROM invoices")]);
  const total = Number(totals[0]?.total ?? 0);
  return { user, rows, total, page, pageSize, pageCount: pageCount(total, pageSize) };
}

/** Accepted quotations which still have at least one line available for invoicing. */
export async function listQuotationsForInvoicing(input: PaginationInput = {}) {
  const user = await requireUser(["admin", "manager", "accounting"]);
  const { page, pageSize, offset } = parsePagination(input);
  const where = `q.status = 'accepted'
    AND EXISTS (
      SELECT 1 FROM quotation_items qi
      WHERE qi.quotation_revision_id = q.current_revision_id
        AND NOT EXISTS (
          SELECT 1 FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
          WHERE ii.source_quotation_item_id = qi.id AND i.status = 'issued'
        )
    )`;
  const [rows, totals] = await Promise.all([
    query<any>(`SELECT q.id, q.quotation_no, c.legal_name AS customer_name,
        r.document_date::text, r.valid_until::text, r.grand_total::text,
        (SELECT count(*)::int FROM quotation_items qi WHERE qi.quotation_revision_id = q.current_revision_id) AS line_count,
        (SELECT count(*)::int FROM quotation_items qi WHERE qi.quotation_revision_id = q.current_revision_id
          AND NOT EXISTS (SELECT 1 FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
            WHERE ii.source_quotation_item_id = qi.id AND i.status = 'issued')) AS remaining_line_count
      FROM quotations q JOIN customers c ON c.id = q.customer_id
      JOIN quotation_revisions r ON r.id = q.current_revision_id
      WHERE ${where}
      ORDER BY r.document_date DESC, q.quotation_no DESC LIMIT $1 OFFSET $2`, [pageSize, offset]),
    query<{ total: string }>(`SELECT count(*)::text AS total FROM quotations q WHERE ${where}`),
  ]);
  const total = Number(totals[0]?.total ?? 0);
  return { user, rows, total, page, pageSize, pageCount: pageCount(total, pageSize) };
}

/** Read a quotation in the invoice workflow while allowing accounting users to access it. */
export async function getQuotationForInvoicing(id: string) {
  const user = await requireUser(["admin", "manager", "accounting"]);
  if (!z.string().uuid().safeParse(id).success) return null;
  const rows = await query<any>(`SELECT q.id, q.quotation_no, q.customer_id, q.status AS quote_status,
      q.current_revision_id, r.document_date::text AS document_date, r.valid_until::text AS valid_until,
      r.grand_total::text AS grand_total, c.legal_name AS customer_name
    FROM quotations q JOIN quotation_revisions r ON r.id = q.current_revision_id
    JOIN customers c ON c.id = q.customer_id
    WHERE q.id = $1 AND q.status = 'accepted'`, [id]);
  const quotation = rows[0] ?? null;
  if (!quotation) return null;
  const lines = await query<any>(`SELECT qi.*, used.invoice_no AS source_invoice_no
    FROM quotation_items qi
    LEFT JOIN LATERAL (
      SELECT i.invoice_no FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
      WHERE ii.source_quotation_item_id = qi.id AND i.status = 'issued'
      ORDER BY i.created_at LIMIT 1
    ) used ON true
    WHERE qi.quotation_revision_id = $1 ORDER BY qi.line_no`, [quotation.current_revision_id]);
  return { user, quotation, lines };
}

export async function getDashboardSummary() {
  const user = await requireUser();
  const [quotes, invoices, notes] = await Promise.all([
    query<{ count: string; total: string }>(`SELECT count(*)::text, COALESCE(sum(r.grand_total),0)::text AS total FROM quotations q JOIN quotation_revisions r ON r.id = q.current_revision_id WHERE q.status IN ('sent','accepted') AND ($1 IN ('admin','manager') OR q.owner_user_id = $2)`, [user.role, user.id]),
    query<{ count: string; total: string }>("SELECT count(*)::text, COALESCE(sum(grand_total),0)::text AS total FROM invoices WHERE status = 'issued'"),
    query<{ count: string; total: string }>("SELECT count(*)::text, COALESCE(sum(total_amount),0)::text AS total FROM billing_notes WHERE status = 'issued'"),
  ]);
  return { quotation: quotes[0], invoice: invoices[0], billingNote: notes[0] };
}

export async function getReportsSummary() {
  const user = await requireUser(["admin", "manager", "accounting"]);
  const [sales, outstanding, billing, wht, recent] = await Promise.all([
    query<any>(`SELECT count(*)::int AS invoice_count, COALESCE(sum(grand_total),0)::text AS invoiced_total,
        COALESCE(sum(estimated_wht_amount),0)::text AS wht_total, COALESCE(sum(estimated_receivable),0)::text AS receivable_total
      FROM invoices WHERE status='issued'`),
    query<any>(`SELECT count(*)::int AS invoice_count,
        COALESCE(sum(GREATEST(i.estimated_receivable - COALESCE(p.paid,0),0)),0)::text AS outstanding_total
      FROM invoices i LEFT JOIN (SELECT invoice_id,sum(amount) AS paid FROM receipts WHERE invoice_id IS NOT NULL GROUP BY invoice_id) p ON p.invoice_id=i.id
      WHERE i.status='issued' AND GREATEST(i.estimated_receivable - COALESCE(p.paid,0),0) > 0`),
    query<any>(`SELECT count(*)::int AS note_count, COALESCE(sum(total_amount),0)::text AS billed_total
      FROM billing_notes WHERE status='issued'`),
    query<any>(`SELECT COALESCE(sum(estimated_wht_amount),0)::text AS wht_total, count(*)::int AS invoice_count
      FROM invoices WHERE status='issued'`),
    query<any>(`SELECT i.id,i.invoice_no,i.document_date::text,i.customer_snapshot->>'legal_name' AS customer_name,
        i.grand_total::text,i.estimated_receivable::text,COALESCE(p.paid,0)::text AS paid
      FROM invoices i LEFT JOIN (SELECT invoice_id,sum(amount) AS paid FROM receipts WHERE invoice_id IS NOT NULL GROUP BY invoice_id) p ON p.invoice_id=i.id
      WHERE i.status='issued' ORDER BY i.document_date DESC,i.invoice_no DESC LIMIT 10`),
  ]);
  return { user, sales: sales[0], outstanding: outstanding[0], billing: billing[0], wht: wht[0], recent };
}
