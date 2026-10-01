import "server-only";

import { query } from "@/lib/db";
import type { Role } from "@/lib/auth";
import { pageCount, parsePagination, type PaginatedResult, type PaginationInput } from "@/lib/pagination";
import type { Customer, Product, ProductWithPrice, PriceList, PriceListDetail, PriceListItem } from "./types";

export async function listCustomers(search = "", input: PaginationInput = {}): Promise<PaginatedResult<Customer>> {
  const term = search.trim();
  const { page, pageSize, offset } = parsePagination(input);
  const [rows, totals] = await Promise.all([query<Customer>(
    `SELECT id, customer_code, legal_name, tax_id, branch_name, address, contact_name, contact_phone,
            contact_email, credit_days, billing_schedule, payment_schedule, notes, is_active, created_at, updated_at
       FROM customers
      WHERE ($1 = '' OR customer_code ILIKE '%' || $1 || '%' OR legal_name ILIKE '%' || $1 || '%' OR contact_name ILIKE '%' || $1 || '%')
      ORDER BY is_active DESC, legal_name ASC LIMIT $2 OFFSET $3`,
    [term, pageSize, offset],
  ), query<{ total: string }>(
    `SELECT count(*)::text AS total FROM customers
      WHERE ($1 = '' OR customer_code ILIKE '%' || $1 || '%' OR legal_name ILIKE '%' || $1 || '%' OR contact_name ILIKE '%' || $1 || '%')`,
    [term],
  )]);
  const total = Number(totals[0]?.total ?? 0);
  return { rows, total, page, pageSize, pageCount: pageCount(total, pageSize) };
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const rows = await query<Customer>(
    `SELECT id, customer_code, legal_name, tax_id, branch_name, address, contact_name, contact_phone,
            contact_email, credit_days, billing_schedule, payment_schedule, notes, is_active, created_at, updated_at
       FROM customers WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function listProducts(search = ""): Promise<Product[]> {
  const term = search.trim();
  return query<Product>(
    `SELECT id, product_code, model, vendor_part, name, description, kind, category, unit, warranty,
            is_active, created_at, updated_at
       FROM products
      WHERE ($1 = '' OR product_code ILIKE '%' || $1 || '%' OR model ILIKE '%' || $1 || '%' OR name ILIKE '%' || $1 || '%')
      ORDER BY is_active DESC, name ASC`,
    [term],
  );
}

export async function listProductsWithPrices(search = "", viewerRole: Role, input: PaginationInput = {}): Promise<PaginatedResult<ProductWithPrice>> {
  const term = search.trim();
  const { page, pageSize, offset } = parsePagination(input);
  const canViewCost = viewerRole === "admin" || viewerRole === "manager";
  const costSelect = canViewCost ? ", current_price.cost_price" : "";
  const [rows, totals] = await Promise.all([query<ProductWithPrice>(
    `SELECT p.id, p.product_code, p.model, p.vendor_part, p.name, p.description, p.kind,
            p.category, p.unit, p.warranty, p.is_active, p.created_at, p.updated_at,
            current_price.selling_price, current_price.price_list_name, current_price.price_list_status${costSelect}
       FROM products p
       LEFT JOIN LATERAL (
         SELECT pli.selling_price::text AS selling_price, pli.cost_price::text AS cost_price,
                pl.name AS price_list_name, pl.status AS price_list_status,
                pl.valid_from, pl.version, pl.created_at
           FROM price_list_items pli
           JOIN price_lists pl ON pl.id = pli.price_list_id
          WHERE pli.product_id = p.id
            AND pl.status = 'published'
            AND pl.valid_from <= CURRENT_DATE
            AND (pl.valid_to IS NULL OR pl.valid_to >= CURRENT_DATE)
          ORDER BY pl.valid_from DESC, pl.version DESC, pl.created_at DESC
          LIMIT 1
       ) current_price ON true
      WHERE ($1 = '' OR p.product_code ILIKE '%' || $1 || '%' OR p.model ILIKE '%' || $1 || '%' OR p.name ILIKE '%' || $1 || '%')
      ORDER BY p.is_active DESC, p.name ASC LIMIT $2 OFFSET $3`,
    [term, pageSize, offset],
  ), query<{ total: string }>(
    `SELECT count(*)::text AS total FROM products p
      WHERE ($1 = '' OR p.product_code ILIKE '%' || $1 || '%' OR p.model ILIKE '%' || $1 || '%' OR p.name ILIKE '%' || $1 || '%')`,
    [term],
  )]);
  const total = Number(totals[0]?.total ?? 0);
  return { rows, total, page, pageSize, pageCount: pageCount(total, pageSize) };
}

export async function getProduct(id: string): Promise<Product | null> {
  const rows = await query<Product>(
    `SELECT id, product_code, model, vendor_part, name, description, kind, category, unit, warranty,
            is_active, created_at, updated_at
       FROM products WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function listPriceLists(includeDrafts = true, input: PaginationInput = {}): Promise<PaginatedResult<PriceList>> {
  const { page, pageSize, offset } = parsePagination(input);
  const [rows, totals] = await Promise.all([query<PriceList>(
    `SELECT pl.id, pl.code, pl.name, pl.version, pl.valid_from, pl.valid_to, pl.status, pl.currency,
            pl.created_at, pl.updated_at, COUNT(pli.id)::int AS item_count
       FROM price_lists pl LEFT JOIN price_list_items pli ON pli.price_list_id = pl.id
      WHERE ($1 = true OR pl.status = 'published')
      GROUP BY pl.id ORDER BY pl.created_at DESC LIMIT $2 OFFSET $3`,
    [includeDrafts, pageSize, offset],
  ), query<{ total: string }>(
    `SELECT count(*)::text AS total FROM price_lists WHERE ($1 = true OR status = 'published')`,
    [includeDrafts],
  )]);
  const total = Number(totals[0]?.total ?? 0);
  return { rows, total, page, pageSize, pageCount: pageCount(total, pageSize) };
}

export type PriceListSummary = {
  published_count: number;
  draft_count: number;
  retired_count: number;
  current: PriceList | null;
};

/**
 * The current price source is deliberately a published, date-effective list.
 * Draft prices remain visible to managers in the price-list workspace but are
 * never used as the default sales price until explicitly published.
 */
export async function getPriceListSummary(): Promise<PriceListSummary> {
  const [counts, current] = await Promise.all([
    query<{ status: PriceList["status"]; count: string }>(
      `SELECT status, count(*)::text AS count
         FROM price_lists
        GROUP BY status`,
    ),
    query<PriceList>(
      `SELECT pl.id, pl.code, pl.name, pl.version, pl.valid_from, pl.valid_to, pl.status, pl.currency,
              pl.created_at, pl.updated_at, count(pli.id)::int AS item_count
         FROM price_lists pl
         LEFT JOIN price_list_items pli ON pli.price_list_id = pl.id
        WHERE pl.status = 'published'
          AND pl.valid_from <= CURRENT_DATE
          AND (pl.valid_to IS NULL OR pl.valid_to >= CURRENT_DATE)
        GROUP BY pl.id
        ORDER BY pl.valid_from DESC, pl.version DESC, pl.created_at DESC
        LIMIT 1`,
    ),
  ]);
  const byStatus = new Map(counts.map((row) => [row.status, Number(row.count)]));
  return {
    published_count: byStatus.get("published") ?? 0,
    draft_count: byStatus.get("draft") ?? 0,
    retired_count: byStatus.get("retired") ?? 0,
    current: current[0] ?? null,
  };
}

export async function getPriceList(id: string, viewerRole: Role): Promise<PriceListDetail | null> {
  const lists = await query<PriceList>(
    `SELECT id, code, name, version, valid_from, valid_to, status, currency, created_at, updated_at
       FROM price_lists WHERE id = $1`,
    [id],
  );
  const list = lists[0];
  if (!list) return null;
  const costSelect = viewerRole === "admin" || viewerRole === "manager" ? ", pli.cost_price" : "";
  const items = await query<PriceListItem>(
    `SELECT pli.id, pli.price_list_id, pli.product_id, p.product_code, p.name AS product_name, p.unit,
            pli.selling_price, pli.tax_basis, pli.vat_rate, pli.srp_price${costSelect}
       FROM price_list_items pli JOIN products p ON p.id = pli.product_id
      WHERE pli.price_list_id = $1 ORDER BY p.name ASC`,
    [id],
  );
  return { ...list, items };
}

export async function listActiveProducts(): Promise<Product[]> {
  return query<Product>(
    `SELECT id, product_code, model, vendor_part, name, description, kind, category, unit, warranty,
            is_active, created_at, updated_at FROM products WHERE is_active = true ORDER BY name ASC`,
  );
}
