export function calculateGST(subtotal, shippingState, billingState, rate = 18) {
  const taxableAmount = subtotal;
  const isInterState = shippingState !== billingState;

  if (isInterState) {
    const igst = (taxableAmount * rate) / 100;
    return { cgst: 0, sgst: 0, igst: round2(igst), total: round2(igst), rate };
  }

  const half = (taxableAmount * rate) / 200;
  return { cgst: round2(half), sgst: round2(half), igst: 0, total: round2(half * 2), rate };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
