import { describe, expect, it } from 'vitest';
import { formatPriceInput, parsePriceToCents } from '@/modules/products/lib/product-format';

describe('product-format', () => {
  it('converte preços em reais para centavos', () => {
    expect(parsePriceToCents('45,90')).toBe(4590);
    expect(parsePriceToCents('1.234,56')).toBe(123456);
    expect(parsePriceToCents('45')).toBe(4500);
    expect(parsePriceToCents('1.234')).toBe(123400);
    expect(parsePriceToCents('45.90')).toBe(4590);
    expect(parsePriceToCents('R$ 45,90')).toBe(4590);
  });

  it('rejeita preços inválidos', () => {
    expect(parsePriceToCents('')).toBeNull();
    expect(parsePriceToCents('abc')).toBeNull();
    expect(parsePriceToCents('-10')).toBeNull();
    expect(parsePriceToCents('1,234')).toBeNull();
  });

  it('formata centavos para o campo de preço', () => {
    expect(formatPriceInput(4590)).toBe('45,90');
    expect(formatPriceInput(123456)).toBe('1.234,56');
  });
});
