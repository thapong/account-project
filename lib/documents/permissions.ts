import type { SessionUser } from "@/lib/auth";
import { canIssueInvoice, canManageBillingNote, canReadInvoice, canReadOwnedDocument, canWriteOwnedDocument } from "./types";

export { canIssueInvoice, canManageBillingNote, canReadInvoice, canReadOwnedDocument, canWriteOwnedDocument };

export function canTransitionQuotation(user: SessionUser, ownerUserId: string, from: string, to: string) {
  if (user.role === "admin" || user.role === "manager") {
    return (from === "draft" && (to === "sent" || to === "cancelled")) ||
      (from === "sent" && (to === "accepted" || to === "cancelled")) ||
      (from === "accepted" && to === "cancelled");
  }
  if (user.role !== "sales" || user.id !== ownerUserId) return false;
  return (from === "draft" && to === "sent") || (from === "sent" && to === "accepted") || (from !== "accepted" && to === "cancelled");
}
