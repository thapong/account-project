CREATE TABLE IF NOT EXISTS receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no text UNIQUE NOT NULL,
  invoice_id uuid REFERENCES invoices(id) ON DELETE RESTRICT,
  billing_note_id uuid REFERENCES billing_notes(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  receipt_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(18,2) NOT NULL CHECK (amount >= 0),
  seller_snapshot jsonb NOT NULL,
  customer_snapshot jsonb NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (((invoice_id IS NOT NULL)::integer + (billing_note_id IS NOT NULL)::integer) = 1),
  UNIQUE(invoice_id), UNIQUE(billing_note_id)
);
CREATE INDEX IF NOT EXISTS receipts_date_idx ON receipts(receipt_date DESC);
CREATE TABLE IF NOT EXISTS receipt_sequences (sequence_key text PRIMARY KEY, next_number integer NOT NULL DEFAULT 1);
INSERT INTO receipt_sequences(sequence_key) VALUES ('receipt') ON CONFLICT DO NOTHING;
