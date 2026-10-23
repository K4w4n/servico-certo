import { describe, expect, it } from 'vitest';
import { InvalidPriceError } from '../errors/product.errors.js';
import { Price } from './price.js';

describe('Price', () => {
  it('cria a partir de centavos', () => {
    const price = Price.fromCents(1999);

    expect(price.cents).toBe(1999);
    expect(price.toNumber()).toBe(19.99);
  });

  it('aceita preço zero', () => {
    const price = Price.fromCents(0);

    expect(price.cents).toBe(0);
  });

  it('rejeita centavos negativos', () => {
    expect(() => Price.fromCents(-1)).toThrow(InvalidPriceError);
  });

  it('rejeita centavos não inteiros', () => {
    expect(() => Price.fromCents(19.99)).toThrow(InvalidPriceError);
  });

  it('aceita o preço máximo', () => {
    const price = Price.fromCents(9_999_999_999);

    expect(price.cents).toBe(9_999_999_999);
    expect(price.toNumber()).toBe(99_999_999.99);
  });

  it('rejeita preço acima do limite', () => {
    expect(() => Price.fromCents(10_000_000_000)).toThrow(InvalidPriceError);
  });

  it('compara preços por centavos', () => {
    expect(Price.fromCents(1999).equals(Price.fromCents(1999))).toBe(true);
    expect(Price.fromCents(1999).equals(Price.fromCents(2000))).toBe(false);
  });
});
