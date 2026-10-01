-- Allow one accepted quotation to be invoiced in multiple, non-overlapping batches.
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_source_quotation_id_key;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS wht_rate numeric(7,4) NOT NULL DEFAULT 0 CHECK (wht_rate BETWEEN 0 AND 100);
CREATE INDEX IF NOT EXISTS invoice_items_source_quotation_item_idx ON invoice_items(source_quotation_item_id);
