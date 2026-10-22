import { InvalidDocumentError } from '../errors/customer.errors.js';

export const DOCUMENT_TYPES = ['CPF', 'CNPJ'] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

const CPF_FIRST_WEIGHTS = [10, 9, 8, 7, 6, 5, 4, 3, 2];
const CPF_SECOND_WEIGHTS = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_SECOND_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export class Document {
  private constructor(
    readonly value: string,
    readonly type: DocumentType,
  ) {}

  static create(raw: string, type: DocumentType): Document {
    const value = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    if (type === 'CPF') {
      if (!/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value) || !isValidCpf(value)) {
        throw new InvalidDocumentError('CPF inválido');
      }

      return new Document(value, type);
    }

    if (!/^[A-Z0-9]{12}\d{2}$/.test(value) || /^(\d)\1{13}$/.test(value) || !isValidCnpj(value)) {
      throw new InvalidDocumentError('CNPJ inválido');
    }

    return new Document(value, type);
  }

  equals(other: Document | null): boolean {
    return other !== null && this.value === other.value && this.type === other.type;
  }

  toString(): string {
    return this.value;
  }
}

function isValidCpf(value: string): boolean {
  const digits = value.split('').map(Number);
  const firstDigit = calculateDigit(digits.slice(0, 9), CPF_FIRST_WEIGHTS);
  const secondDigit = calculateDigit([...digits.slice(0, 9), firstDigit], CPF_SECOND_WEIGHTS);

  return digits[9] === firstDigit && digits[10] === secondDigit;
}

function isValidCnpj(value: string): boolean {
  const base = value.slice(0, 12);
  const checkDigits = value.slice(12);
  const baseValues = base.split('').map(toCnpjValue);
  const firstDigit = calculateDigit(baseValues, CNPJ_FIRST_WEIGHTS);
  const secondDigit = calculateDigit([...baseValues, firstDigit], CNPJ_SECOND_WEIGHTS);

  return checkDigits === `${firstDigit}${secondDigit}`;
}

function calculateDigit(values: number[], weights: number[]): number {
  const sum = values.reduce((total, value, index) => total + value * (weights[index] ?? 0), 0);
  const remainder = sum % 11;

  return remainder < 2 ? 0 : 11 - remainder;
}

function toCnpjValue(character: string): number {
  return character.charCodeAt(0) - 48;
}
