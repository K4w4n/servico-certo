const priceFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const priceInputFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPrice(priceCents: number): string {
  return priceFormatter.format(priceCents / 100);
}

export function formatPriceInput(priceCents: number): string {
  return priceInputFormatter.format(priceCents / 100);
}

export function parsePriceToCents(value: string): number | null {
  const cleaned = value.trim().replace(/[^\d.,-]/g, '');

  if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === ',') {
    return null;
  }

  let normalized: string;

  if (cleaned.includes(',')) {
    // Formato brasileiro: ponto como milhar e vírgula como decimal.
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    const dotCount = (cleaned.match(/\./g) ?? []).length;

    if (dotCount === 1) {
      const [, decimalPart = ''] = cleaned.split('.');

      normalized = decimalPart.length <= 2 ? cleaned : cleaned.replace(/\./g, '');
    } else {
      normalized = cleaned.replace(/\./g, '');
    }
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return Math.round(amount * 100);
}
