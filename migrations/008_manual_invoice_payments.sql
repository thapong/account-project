-- Support invoices entered directly, payment receipts, and payment reporting.
ALTER TABLE invoices
  ALTER COLUMN source_quotation_id DROP NOT NULL,
  ALTER COLUMN source_quotation_revision_id DROP NOT NULL;

CREATE TABLE payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no text UNIQUE NOT NULL,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(20,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL DEFAULT 'โอนเงิน',
  reference_no text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_receipts_invoice_idx ON payment_receipts(invoice_id, payment_date DESC);
CREATE INDEX payment_receipts_customer_idx ON payment_receipts(customer_id, payment_date DESC);
CREATE TABLE IF NOT EXISTS payment_receipt_sequences (
  sequence_key text PRIMARY KEY,
  next_number bigint NOT NULL DEFAULT 1 CHECK (next_number > 0)
);
INSERT INTO payment_receipt_sequences(sequence_key) VALUES ('payment_receipt') ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION reserve_payment_receipt_number()
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE v_number bigint;
BEGIN
  UPDATE payment_receipt_sequences SET next_number = next_number + 1
    WHERE sequence_key = 'payment_receipt'
    RETURNING next_number - 1 INTO v_number;
  IF v_number IS NULL THEN RAISE EXCEPTION 'Payment receipt sequence is unavailable'; END IF;
  RETURN v_number;
END;
$$;
