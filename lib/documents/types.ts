import type { Role, SessionUser } from "@/lib/auth";

export type TaxBasis = "exclusive" | "inclusive";
export type TaxCode = "standard" | "zero" | "exempt";

export type QuoteLineInput = {
  productId?: string | null;
  sourcePriceListItemId?: string | null;
  productCodeSnapshot?: string;
  nameSnapshot?: string;
  descriptionSnapshot?: string;
  unitSnapshot?: string;
  warrantySnapshot?: string;
  quantity: string | number;
  unitPrice: string | number;
  taxBasis: TaxBasis;
  vatRate: string | number;
  taxCode?: TaxCode;
  lineDiscountAmount?: string | number;
  whtRate?: string | number;
};

export type CalculatedQuoteLine = {
  lineNo: number;
  productId: string | null;
  sourcePriceListItemId: string | null;
  productCodeSnapshot?: string;
  nameSnapshot?: string;
  descriptionSnapshot?: string;
  unitSnapshot?: string;
  warrantySnapshot?: string;
  quantity: string;
  inputUnitPrice: string;
  unitPriceExVat: string;
  taxBasis: TaxBasis;
  vatRate: string;
  taxCode: TaxCode;
  whtRate: string;
  lineSubtotal: string;
  lineDiscountAmount: string;
  beforeDocumentDiscount: string;
  documentDiscountAllocated: string;
  netAmount: string;
  vatAmount: string;
  totalAmount: string;
  whtBaseAmount: string;
};

export type CalculationResult = {
  lines: CalculatedQuoteLine[];
  subtotal: string;
  lineDiscountTotal: string;
  documentDiscountAmount: string;
  taxableAmount: string;
  vatAmount: string;
  grandTotal: string;
  estimatedWhtAmount: string;
  estimatedReceivable: string;
};

export type DocumentPermission = "read" | "write" | "transition";

export function canReadOwnedDocument(user: SessionUser, ownerUserId: string) {
  return user.role === "admin" || user.role === "manager" ||
    (user.role === "sales" && user.id === ownerUserId);
}

export function canWriteOwnedDocument(user: SessionUser, ownerUserId: string) {
  return user.role === "admin" || user.role === "manager" ||
    (user.role === "sales" && user.id === ownerUserId);
}

export function canReadInvoice(user: SessionUser) {
  return user.role === "admin" || user.role === "manager" || user.role === "accounting";
}

export function canIssueInvoice(user: SessionUser) {
  return user.role === "admin" || user.role === "manager" || user.role === "accounting";
}

export function canManageBillingNote(user: SessionUser) {
  return user.role === "admin" || user.role === "manager" || user.role === "accounting";
}

export type UserRole = Role;
