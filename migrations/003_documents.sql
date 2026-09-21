-- Sales document schema. Run after 001_auth.sql and 002_masters.sql.
-- Published source prices and all issued documents are immutable by application policy.

CREATE TABLE document_sequences (
  sequence_key text PRIMARY KEY,
  next_number bigint NOT NULL DEFAULT 1 CHECK (next_number > 0)
);
INSERT INTO document_sequences(sequence_key) VALUES
  ('quotation'), ('invoice'), ('billing_note')
ON CONFLICT (sequence_key) DO NOTHING;

CREATE OR REPLACE FUNCTION reserve_document_number(p_sequence_key text)
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE v_number bigint;
BEGIN
  UPDATE document_sequences
  SET next_number = next_number + 1
  WHERE sequence_key = p_sequence_key
  RETURNING next_number - 1 INTO v_number;
  IF v_number IS NULL THEN
    RAISE EXCEPTION 'Unknown document sequence';
  END IF;
  RETURN v_number;
END;
$$;

CREATE TABLE quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_no text UNIQUE NOT NULL,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','cancelled')),
  current_revision_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quotations_customer_idx ON quotations(customer_id, created_at DESC);
CREATE INDEX quotations_owner_idx ON quotations(owner_user_id, created_at DESC);
CREATE INDEX quotations_status_idx ON quotations(status, created_at DESC);

CREATE TABLE quotation_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE RESTRICT,
  revision_no integer NOT NULL DEFAULT 1 CHECK (revision_no > 0),
  document_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  currency text NOT NULL DEFAULT 'THB' CHECK (currency = 'THB'),
  tax_mode text NOT NULL DEFAULT 'per_line' CHECK (tax_mode IN ('per_line')),
  seller_snapshot jsonb NOT NULL,
  customer_snapshot jsonb NOT NULL,
  contact_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  payment_terms text NOT NULL DEFAULT '',
  delivery_terms text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  subtotal numeric(20,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  line_discount_total numeric(20,2) NOT NULL DEFAULT 0 CHECK (line_discount_total >= 0),
  document_discount_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK (document_discount_amount >= 0),
  taxable_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK (taxable_amount >= 0),
  vat_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
  grand_total numeric(20,2) NOT NULL DEFAULT 0 CHECK (grand_total >= 0),
  estimated_wht_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK (estimated_wht_amount >= 0),
  estimated_receivable numeric(20,2) NOT NULL DEFAULT 0 CHECK (estimated_receivable >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','cancelled')),
  calculation_policy_version text NOT NULL DEFAULT 'v1',
  row_version integer NOT NULL DEFAULT 1 CHECK (row_version > 0),
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(quotation_id, revision_no),
  UNIQUE(id, quotation_id),
  CHECK (valid_until IS NULL OR valid_until >= document_date)
);
ALTER TABLE quotations
  ADD CONSTRAINT quotations_current_revision_fk
  FOREIGN KEY (current_revision_id, id) REFERENCES quotation_revisions(id, quotation_id) ON DELETE RESTRICT;

CREATE TABLE quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_revision_id uuid NOT NULL REFERENCES quotation_revisions(id) ON DELETE RESTRICT,
  line_no integer NOT NULL CHECK (line_no > 0),
  product_id uuid REFERENCES products(id) ON DELETE RESTRICT,
  source_price_list_item_id uuid REFERENCES price_list_items(id) ON DELETE RESTRICT,
  product_code_snapshot text NOT NULL DEFAULT '',
  name_snapshot text NOT NULL,
  description_snapshot text NOT NULL DEFAULT '',
  unit_snapshot text NOT NULL DEFAULT 'ชิ้น',
  quantity numeric(20,6) NOT NULL CHECK (quantity > 0 AND quantity < 1e12),
  unit_price_ex_vat numeric(20,6) NOT NULL CHECK (unit_price_ex_vat >= 0 AND unit_price_ex_vat < 1e12),
  input_tax_basis text NOT NULL CHECK (input_tax_basis IN ('exclusive','inclusive')),
  input_unit_price numeric(20,6) NOT NULL CHECK (input_unit_price >= 0 AND input_unit_price < 1e12),
  line_discount_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK (line_discount_amount >= 0),
  document_discount_allocated numeric(20,2) NOT NULL DEFAULT 0 CHECK (document_discount_allocated >= 0),
  tax_code text NOT NULL DEFAULT 'standard' CHECK (tax_code IN ('standard','zero','exempt')),
  vat_rate numeric(7,4) NOT NULL DEFAULT 7 CHECK (vat_rate BETWEEN 0 AND 100),
  net_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK (net_amount >= 0),
  vat_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
  total_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  wht_rate numeric(7,4) NOT NULL DEFAULT 0 CHECK (wht_rate BETWEEN 0 AND 100),
  wht_base_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK (wht_base_amount >= 0),
  warranty_snapshot text NOT NULL DEFAULT '',
  UNIQUE(quotation_revision_id, line_no)
);
CREATE INDEX quotation_items_product_idx ON quotation_items(product_id);

CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text UNIQUE NOT NULL,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  source_quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE RESTRICT,
  source_quotation_revision_id uuid NOT NULL REFERENCES quotation_revisions(id) ON DELETE RESTRICT,
  document_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  currency text NOT NULL DEFAULT 'THB' CHECK (currency = 'THB'),
  seller_snapshot jsonb NOT NULL,
  customer_snapshot jsonb NOT NULL,
  payment_terms text NOT NULL DEFAULT '',
  tax_mode text NOT NULL DEFAULT 'per_line' CHECK (tax_mode IN ('per_line')),
  subtotal numeric(20,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  line_discount_total numeric(20,2) NOT NULL DEFAULT 0 CHECK (line_discount_total >= 0),
  document_discount_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK (document_discount_amount >= 0),
  taxable_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK (taxable_amount >= 0),
  vat_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
  grand_total numeric(20,2) NOT NULL DEFAULT 0 CHECK (grand_total >= 0),
  estimated_wht_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK (estimated_wht_amount >= 0),
  estimated_receivable numeric(20,2) NOT NULL DEFAULT 0 CHECK (estimated_receivable >= 0),
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','cancelled')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  cancellation_reason text,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_quotation_id),
  CHECK (due_date IS NULL OR due_date >= document_date)
);
CREATE INDEX invoices_customer_idx ON invoices(customer_id, document_date DESC);
CREATE INDEX invoices_status_idx ON invoices(status, document_date DESC);

CREATE TABLE invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  line_no integer NOT NULL CHECK (line_no > 0),
  source_quotation_item_id uuid REFERENCES quotation_items(id) ON DELETE RESTRICT,
  product_id uuid REFERENCES products(id) ON DELETE RESTRICT,
  product_code_snapshot text NOT NULL DEFAULT '',
  name_snapshot text NOT NULL,
  description_snapshot text NOT NULL DEFAULT '',
  unit_snapshot text NOT NULL DEFAULT 'ชิ้น',
  quantity numeric(20,6) NOT NULL CHECK (quantity > 0),
  unit_price_ex_vat numeric(20,6) NOT NULL CHECK (unit_price_ex_vat >= 0),
  input_tax_basis text NOT NULL CHECK (input_tax_basis IN ('exclusive','inclusive')),
  input_unit_price numeric(20,6) NOT NULL CHECK (input_unit_price >= 0),
  line_discount_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK (line_discount_amount >= 0),
  document_discount_allocated numeric(20,2) NOT NULL DEFAULT 0 CHECK (document_discount_allocated >= 0),
  tax_code text NOT NULL DEFAULT 'standard' CHECK (tax_code IN ('standard','zero','exempt')),
  vat_rate numeric(7,4) NOT NULL DEFAULT 7 CHECK (vat_rate BETWEEN 0 AND 100),
  net_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK (net_amount >= 0),
  vat_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
  total_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  wht_rate numeric(7,4) NOT NULL DEFAULT 0 CHECK (wht_rate BETWEEN 0 AND 100),
  wht_base_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK (wht_base_amount >= 0),
  UNIQUE(invoice_id, line_no)
);

CREATE TABLE billing_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_note_no text UNIQUE NOT NULL,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  document_date date NOT NULL DEFAULT CURRENT_DATE,
  appointment_date date,
  seller_snapshot jsonb NOT NULL,
  customer_snapshot jsonb NOT NULL,
  currency text NOT NULL DEFAULT 'THB' CHECK (currency = 'THB'),
  total_amount numeric(20,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','issued','cancelled')),
  notes text NOT NULL DEFAULT '',
  issued_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (appointment_date IS NULL OR appointment_date >= document_date)
);
CREATE TABLE billing_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_note_id uuid NOT NULL REFERENCES billing_notes(id) ON DELETE RESTRICT,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  line_no integer NOT NULL CHECK (line_no > 0),
  invoice_no_snapshot text NOT NULL,
  invoice_date_snapshot date NOT NULL,
  due_date_snapshot date,
  outstanding_at_issue numeric(20,2) NOT NULL CHECK (outstanding_at_issue > 0),
  billed_amount numeric(20,2) NOT NULL CHECK (billed_amount > 0),
  released_at timestamptz,
  release_reason text,
  UNIQUE(billing_note_id, invoice_id),
  UNIQUE(billing_note_id, line_no)
);
CREATE UNIQUE INDEX billing_note_active_invoice_uq ON billing_note_items(invoice_id)
  WHERE released_at IS NULL;

CREATE TABLE document_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE RESTRICT,
  quotation_revision_id uuid REFERENCES quotation_revisions(id) ON DELETE RESTRICT,
  invoice_id uuid REFERENCES invoices(id) ON DELETE RESTRICT,
  billing_note_id uuid REFERENCES billing_notes(id) ON DELETE RESTRICT,
  event_type text NOT NULL,
  actor_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason text NOT NULL DEFAULT '',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CHECK (((quotation_id IS NOT NULL)::integer + (quotation_revision_id IS NOT NULL)::integer +
          (invoice_id IS NOT NULL)::integer + (billing_note_id IS NOT NULL)::integer) = 1)
);
