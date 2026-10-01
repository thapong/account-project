import "server-only";

import { query } from "@/lib/db";

export type ImportReviewBatch = {
  id: string;
  filename: string;
  status: "completed" | "needs_review";
  imported_count: number;
  issue_count: number;
  created_at: string;
};

export type ImportReviewRow = {
  source_row: number;
  issues: string[];
  raw_data: Record<string, unknown>;
};

export async function getProductImportReview(): Promise<{
  batch: ImportReviewBatch | null;
  rows: ImportReviewRow[];
}> {
  const batches = await query<ImportReviewBatch>(
    `SELECT id, filename, status, imported_count,
            jsonb_array_length(issues)::int AS issue_count, created_at
       FROM import_batches
      WHERE filename = 'Products.xlsx'
      ORDER BY created_at DESC
      LIMIT 1`,
  );
  const batch = batches[0] ?? null;
  if (!batch || batch.issue_count === 0) return { batch, rows: [] };

  const rows = await query<{ source_row: number; issues: string[]; raw_data: Record<string, unknown> }>(
    `SELECT (issue->>'row')::int AS source_row,
            ARRAY(SELECT jsonb_array_elements_text(issue->'issues')) AS issues,
            COALESCE(ir.raw_data, '{}'::jsonb) AS raw_data
       FROM import_batches b
       CROSS JOIN LATERAL jsonb_array_elements(b.issues) AS issue
       LEFT JOIN import_rows ir
         ON ir.batch_id = b.id
        AND ir.row_number = (issue->>'row')::int
      WHERE b.id = $1
      ORDER BY (issue->>'row')::int`,
    [batch.id],
  );
  return { batch, rows };
}
