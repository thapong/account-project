ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS internal_note text NOT NULL DEFAULT '';

ALTER TABLE receipts
  DROP CONSTRAINT IF EXISTS receipts_invoice_id_key,
  DROP CONSTRAINT IF EXISTS receipts_billing_note_id_key;

CREATE INDEX IF NOT EXISTS receipts_invoice_idx ON receipts(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS receipts_billing_note_idx ON receipts(billing_note_id) WHERE billing_note_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS receipt_payment_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  line_no integer NOT NULL CHECK (line_no > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque')),
  bank_account_snapshot jsonb,
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  evidence_filename text,
  evidence_mime_type text,
  evidence_data bytea,
  UNIQUE(receipt_id, line_no)
);
CREATE INDEX IF NOT EXISTS receipt_payment_details_receipt_idx ON receipt_payment_details(receipt_id, line_no);

INSERT INTO receipt_payment_details(receipt_id,line_no,payment_method,amount,payment_date)
SELECT id,1,'cash',amount,receipt_date FROM receipts
ON CONFLICT (receipt_id,line_no) DO NOTHING;
