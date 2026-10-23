import { InvalidServicePriceError } from '../errors/service.errors.js';

export const MAX_SERVICE_PRICE_CENTS = 9_999_999_999;

export class ServicePrice {
  private constructor(readonly cents: number) {}

  static fromCents(cents: number): ServicePrice {
    if (!Number.isSafeInteger(cents) || cents < 0 || cents > MAX_SERVICE_PRICE_CENTS) {
      throw new InvalidServicePriceError('Preço inválido');
    }

    return new ServicePrice(cents);
  }

  toNumber(): number {
    return this.cents / 100;
  }

  equals(other: ServicePrice): boolean {
    return this.cents === other.cents;
  }

  toString(): string {
    return this.toNumber().toFixed(2);
  }
}
