import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
  await requireUser(["admin", "manager", "accounting"]);
  const { id, paymentId } = await params;
  const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  if (!isUuid(id) || !isUuid(paymentId)) return new Response("ไม่พบไฟล์", { status: 404 });
  const rows = await query<{ evidence_data: Buffer; evidence_filename: string; evidence_mime_type: string }>(
    "SELECT evidence_data,evidence_filename,evidence_mime_type FROM receipt_payment_details WHERE id=$1 AND receipt_id=$2 AND evidence_data IS NOT NULL",
    [paymentId, id],
  );
  const file = rows[0];
  if (!file) return new Response("ไม่พบไฟล์", { status: 404 });
  const filename = file.evidence_filename.replace(/[\r\n"\\]/g, "_");
  return new Response(new Uint8Array(file.evidence_data), {
    headers: {
      "Content-Type": file.evidence_mime_type,
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(file.evidence_filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
