CREATE TABLE company_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  legal_name text NOT NULL DEFAULT 'บริษัทของคุณ',
  tax_id text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT ''
);
INSERT INTO company_settings(id) VALUES(true);

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code text UNIQUE NOT NULL,
  legal_name text NOT NULL,
  tax_id text,
  branch_name text NOT NULL DEFAULT 'สำนักงานใหญ่',
  address text NOT NULL DEFAULT '',
  contact_name text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  credit_days integer CHECK (credit_days >= 0),
  billing_schedule text NOT NULL DEFAULT '',
  payment_schedule text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customers_name_idx ON customers(legal_name);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text UNIQUE NOT NULL,
  model text NOT NULL DEFAULT '',
  vendor_part text NOT NULL DEFAULT '',
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'hardware' CHECK(kind IN ('hardware','service','subscription')),
  category text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT 'ชิ้น',
  warranty text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_name_idx ON products(name);

CREATE TABLE price_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  valid_from date NOT NULL,
  valid_to date CHECK(valid_to >= valid_from),
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','retired')),
  currency text NOT NULL DEFAULT 'THB' CHECK(currency='THB'),
  created_by uuid REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE price_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id uuid NOT NULL REFERENCES price_lists(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  selling_price numeric(20,6) NOT NULL CHECK(selling_price >= 0 AND selling_price < 1e12),
  tax_basis text NOT NULL CHECK(tax_basis IN ('exclusive','inclusive')),
  vat_rate numeric(7,4) NOT NULL DEFAULT 7 CHECK(vat_rate BETWEEN 0 AND 100),
  cost_price numeric(20,6) CHECK(cost_price >= 0 AND cost_price < 1e12),
  srp_price numeric(20,6) CHECK(srp_price >= 0 AND srp_price < 1e12),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(price_list_id,product_id)
);
CREATE INDEX price_list_items_product_idx ON price_list_items(product_id);

CREATE TABLE import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  file_sha256 text NOT NULL UNIQUE,
  status text NOT NULL CHECK(status IN ('completed','needs_review')),
  imported_count integer NOT NULL DEFAULT 0,
  issues jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES import_batches(id),
  sheet_name text NOT NULL,
  row_number integer NOT NULL,
  raw_data jsonb NOT NULL,
  customer_id uuid REFERENCES customers(id),
  UNIQUE(batch_id,sheet_name,row_number)
);
