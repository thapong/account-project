export type MasterActionState = {
  message?: string;
  fieldErrors?: Record<string, string[]>;
  ok?: boolean;
};

export type Customer = {
  id: string;
  customer_code: string;
  legal_name: string;
  tax_id: string | null;
  branch_name: string;
  address: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  credit_days: number | null;
  billing_schedule: string;
  payment_schedule: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  product_code: string;
  model: string;
  vendor_part: string;
  name: string;
  description: string;
  kind: "hardware" | "service" | "subscription";
  category: string;
  unit: string;
  warranty: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/** Product row with the most relevant price visible to the current role. */
export type ProductWithPrice = Product & {
  selling_price: string | null;
  cost_price?: string | null;
  price_list_name: string | null;
  price_list_status: PriceList["status"] | null;
};

export type PriceList = {
  id: string;
  code: string;
  name: string;
  version: number;
  valid_from: string;
  valid_to: string | null;
  status: "draft" | "published" | "retired";
  currency: "THB";
  created_at: string;
  updated_at: string;
  item_count?: number;
};

export type PriceListItem = {
  id: string;
  price_list_id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  unit: string;
  selling_price: string;
  tax_basis: "exclusive" | "inclusive";
  vat_rate: string;
  srp_price: string | null;
  cost_price?: string | null;
};

export type PriceListDetail = PriceList & { items: PriceListItem[] };
