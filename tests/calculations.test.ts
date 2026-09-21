import test from "node:test";
import assert from "node:assert/strict";
import { calculateQuotation } from "@/lib/documents/calculations";

test("converts inclusive prices to exclusive VAT before discounting", () => {
    const result = calculateQuotation([{ quantity: 1, unitPrice: "107", taxBasis: "inclusive", vatRate: 7 }]);
    assert.equal(result.subtotal, "100.00");
    assert.equal(result.vatAmount, "7.00");
    assert.equal(result.grandTotal, "107.00");
  });

test("allocates a document discount and preserves the exact total", () => {
    const result = calculateQuotation([
      { quantity: 1, unitPrice: 100, taxBasis: "exclusive", vatRate: 7 },
      { quantity: 1, unitPrice: 200, taxBasis: "exclusive", vatRate: 7 },
    ], "10");
    assert.equal(result.lines[0].documentDiscountAllocated, "3.33");
    assert.equal(result.lines[1].documentDiscountAllocated, "6.67");
    assert.equal(result.documentDiscountAmount, "10.00");
    assert.equal(result.grandTotal, "310.70");
  });

test("does not apply VAT to zero or exempt lines", () => {
    const result = calculateQuotation([
      { quantity: 1, unitPrice: 100, taxBasis: "exclusive", vatRate: 7, taxCode: "zero" },
      { quantity: 1, unitPrice: 100, taxBasis: "exclusive", vatRate: 7, taxCode: "exempt" },
    ]);
    assert.equal(result.vatAmount, "0.00");
    assert.equal(result.grandTotal, "200.00");
  });
