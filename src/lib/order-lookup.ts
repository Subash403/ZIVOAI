export function resolvePublicOrderId(rawOrderId: string): string {
  const trimmed = rawOrderId.trim();
  try {
    return decodeURIComponent(trimmed).trim();
  } catch {
    return trimmed;
  }
}

export function publicOrderLookupWhere(orderId: string) {
  return {
    OR: [{ orderId }, { id: orderId }],
  };
}
