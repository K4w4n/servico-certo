import { describe, expect, it } from 'vitest';
import { InvalidServicePriceError } from '../errors/service.errors.js';
import { ServicePrice } from './price.js';

describe('ServicePrice', () => {
  it('cria a partir de centavos', () => {
    const price = ServicePrice.fromCents(1999);

    expect(price.cents).toBe(1999);
    expect(price.toNumber()).toBe(19.99);
  });

  it('aceita preço zero', () => {
    const price = ServicePrice.fromCents(0);

    expect(price.cents).toBe(0);
  });

  it('rejeita centavos negativos', () => {
    expect(() => ServicePrice.fromCents(-1)).toThrow(InvalidServicePriceError);
  });

  it('rejeita centavos não inteiros', () => {
    expect(() => ServicePrice.fromCents(19.99)).toThrow(InvalidServicePriceError);
  });

  it('aceita o preço máximo', () => {
    const price = ServicePrice.fromCents(9_999_999_999);

    expect(price.cents).toBe(9_999_999_999);
    expect(price.toNumber()).toBe(99_999_999.99);
  });

  it('rejeita preço acima do limite', () => {
    expect(() => ServicePrice.fromCents(10_000_000_000)).toThrow(InvalidServicePriceError);
  });

  it('compara preços por centavos', () => {
    expect(ServicePrice.fromCents(1999).equals(ServicePrice.fromCents(1999))).toBe(true);
    expect(ServicePrice.fromCents(1999).equals(ServicePrice.fromCents(2000))).toBe(false);
  });
});
