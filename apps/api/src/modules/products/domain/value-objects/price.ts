import { InvalidPriceError } from '../errors/product.errors.js';

export const MAX_PRODUCT_PRICE_CENTS = 9_999_999_999;

export class Price {
  private constructor(readonly cents: number) {}

  static fromCents(cents: number): Price {
    if (!Number.isSafeInteger(cents) || cents < 0 || cents > MAX_PRODUCT_PRICE_CENTS) {
      throw new InvalidPriceError('Preço inválido');
    }

    return new Price(cents);
  }

  toNumber(): number {
    return this.cents / 100;
  }

  equals(other: Price): boolean {
    return this.cents === other.cents;
  }

  toString(): string {
    return this.toNumber().toFixed(2);
  }
}
