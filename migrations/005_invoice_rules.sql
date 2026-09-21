-- Invoice presentation and confirmation workflow.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS document_title text NOT NULL DEFAULT 'ใบแจ้งหนี้',
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_document_title_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_document_title_check
  CHECK (document_title IN ('ใบแจ้งหนี้', 'Invoice'));

CREATE INDEX IF NOT EXISTS invoices_confirmation_idx ON invoices(confirmed_at, document_date DESC);
