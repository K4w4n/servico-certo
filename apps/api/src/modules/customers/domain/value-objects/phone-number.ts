import { InvalidPhoneNumberError } from '../errors/customer.errors.js';

export class PhoneNumber {
  private constructor(readonly value: string) {}

  static create(raw: string): PhoneNumber {
    const value = raw.replace(/\D/g, '');

    if (!/^\d{10,11}$/.test(value)) {
      throw new InvalidPhoneNumberError('Telefone deve ter 10 ou 11 dígitos');
    }

    return new PhoneNumber(value);
  }

  equals(other: PhoneNumber | null): boolean {
    return other !== null && this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
