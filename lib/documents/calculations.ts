import Decimal from "decimal.js";
import type { CalculationResult, CalculatedQuoteLine, QuoteLineInput, TaxCode } from "./types";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
const D = (value: Decimal.Value) => new Decimal(value || 0);
const money = (value: Decimal.Value) => D(value).toDecimalPlaces(2).toFixed(2);
const unit = (value: Decimal.Value) => D(value).toDecimalPlaces(6).toFixed(6);
const pct = (value: Decimal.Value) => D(value).toDecimalPlaces(4).toFixed(4);

function nonNegative(value: Decimal.Value, field: string) {
  const d = D(value);
  if (!d.isFinite() || d.isNegative()) throw new Error(`${field} must be a non-negative number`);
  return d;
}

/**
 * Calculates all totals in Decimal arithmetic. Document discounts are allocated
 * proportionally over the post-line-discount exclusive-tax bases; the final line
 * receives the rounding remainder so allocated values always add to the document discount.
 */
export function calculateQuotation(lines: QuoteLineInput[], documentDiscountAmount: Decimal.Value = 0): CalculationResult {
  if (!Array.isArray(lines) || lines.length === 0) throw new Error("At least one line is required");
  const discount = nonNegative(documentDiscountAmount, "Document discount");
  const working = lines.map((input, index) => {
    const quantity = nonNegative(input.quantity, `Quantity on line ${index + 1}`);
    if (quantity.isZero()) throw new Error(`Quantity on line ${index + 1} must be greater than zero`);
    const inputPrice = nonNegative(input.unitPrice, `Price on line ${index + 1}`);
    const vatRate = nonNegative(input.vatRate, `VAT rate on line ${index + 1}`);
    if (vatRate.greaterThan(100)) throw new Error(`VAT rate on line ${index + 1} is invalid`);
    const taxCode = (input.taxCode ?? "standard") as TaxCode;
    if (!["standard", "zero", "exempt"].includes(taxCode)) throw new Error(`Tax code on line ${index + 1} is invalid`);
    const whtRate = nonNegative(input.whtRate ?? 0, `WHT rate on line ${index + 1}`);
    if (whtRate.greaterThan(100)) throw new Error(`WHT rate on line ${index + 1} is invalid`);
    const divisor = input.taxBasis === "inclusive" ? D(1).plus(vatRate.div(100)) : D(1);
    const exVatUnitPrice = inputPrice.div(divisor);
    const lineSubtotal = quantity.mul(exVatUnitPrice);
    const requestedLineDiscount = nonNegative(input.lineDiscountAmount ?? 0, `Line discount on line ${index + 1}`);
    const lineDiscount = Decimal.min(requestedLineDiscount, lineSubtotal);
    return {
      input,
      quantity,
      inputPrice,
      exVatUnitPrice,
      lineSubtotal,
      lineDiscount,
      beforeDocumentDiscount: lineSubtotal.minus(lineDiscount).toDecimalPlaces(2),
      vatRate,
      taxCode,
      whtRate,
    };
  });

  const subtotal = working.reduce((sum, line) => sum.plus(line.lineSubtotal), D(0)).toDecimalPlaces(2);
  const lineDiscountTotal = working.reduce((sum, line) => sum.plus(line.lineDiscount), D(0)).toDecimalPlaces(2);
  const netBeforeDocumentDiscount = working.reduce((sum, line) => sum.plus(line.beforeDocumentDiscount), D(0)).toDecimalPlaces(2);
  const appliedDocumentDiscount = Decimal.min(discount, netBeforeDocumentDiscount).toDecimalPlaces(2);
  let allocatedSoFar = D(0);
  const resultLines: CalculatedQuoteLine[] = working.map((line, index) => {
    const allocated = index === working.length - 1
      ? appliedDocumentDiscount.minus(allocatedSoFar)
      : netBeforeDocumentDiscount.isZero()
        ? D(0)
        : appliedDocumentDiscount.mul(line.beforeDocumentDiscount).div(netBeforeDocumentDiscount).toDecimalPlaces(2);
    allocatedSoFar = allocatedSoFar.plus(allocated);
    const net = Decimal.max(D(0), line.beforeDocumentDiscount.minus(allocated)).toDecimalPlaces(2);
    const vat = line.taxCode === "standard"
      ? net.mul(line.vatRate).div(100).toDecimalPlaces(2)
      : D(0);
    const total = net.plus(vat).toDecimalPlaces(2);
    const whtBase = net;
    return {
      lineNo: index + 1,
      productId: line.input.productId ?? null,
      sourcePriceListItemId: line.input.sourcePriceListItemId ?? null,
      productCodeSnapshot: line.input.productCodeSnapshot,
      nameSnapshot: line.input.nameSnapshot,
      descriptionSnapshot: line.input.descriptionSnapshot,
      unitSnapshot: line.input.unitSnapshot,
      warrantySnapshot: line.input.warrantySnapshot,
      quantity: unit(line.quantity),
      inputUnitPrice: unit(line.inputPrice),
      unitPriceExVat: unit(line.exVatUnitPrice),
      taxBasis: line.input.taxBasis,
      vatRate: pct(line.vatRate),
      taxCode: line.taxCode,
      whtRate: pct(line.whtRate),
      lineSubtotal: money(line.lineSubtotal),
      lineDiscountAmount: money(line.lineDiscount),
      beforeDocumentDiscount: money(line.beforeDocumentDiscount),
      documentDiscountAllocated: money(allocated),
      netAmount: money(net),
      vatAmount: money(vat),
      totalAmount: money(total),
      whtBaseAmount: money(whtBase),
    };
  });
  const taxable = resultLines.reduce((sum, line) => sum.plus(line.netAmount), D(0)).toDecimalPlaces(2);
  const vat = resultLines.reduce((sum, line) => sum.plus(line.vatAmount), D(0)).toDecimalPlaces(2);
  const grand = resultLines.reduce((sum, line) => sum.plus(line.totalAmount), D(0)).toDecimalPlaces(2);
  const wht = resultLines.reduce((sum, line) => sum.plus(D(line.whtBaseAmount).mul(line.whtRate).div(100)), D(0)).toDecimalPlaces(2);
  return {
    lines: resultLines,
    subtotal: money(subtotal),
    lineDiscountTotal: money(lineDiscountTotal),
    documentDiscountAmount: money(appliedDocumentDiscount),
    taxableAmount: money(taxable),
    vatAmount: money(vat),
    grandTotal: money(grand),
    estimatedWhtAmount: money(wht),
    estimatedReceivable: money(grand.minus(wht)),
  };
}

export const calculateQuoteTotals = calculateQuotation;
export const calculateDocumentTotals = calculateQuotation;

export function formatTHB(value: Decimal.Value) {
  return `${D(value).toNumber().toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;
}
