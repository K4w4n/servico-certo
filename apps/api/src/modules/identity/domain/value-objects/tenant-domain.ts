import { InvalidTenantDomainError } from '../errors/identity.errors.js';

const DOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;

const RESERVED_DOMAINS = new Set([
  'www',
  'api',
  'app',
  'admin',
  'docs',
  'mail',
  'support',
  'billing',
  'status',
]);

export class TenantDomain {
  private constructor(readonly value: string) {}

  static create(raw: string): TenantDomain {
    const value = raw.trim().toLowerCase();

    if (value.length < 3 || value.length > 63) {
      throw new InvalidTenantDomainError('O domínio deve ter entre 3 e 63 caracteres');
    }

    if (!DOMAIN_REGEX.test(value)) {
      throw new InvalidTenantDomainError(
        'Use apenas letras minúsculas, números e hífens, sem hífen no início ou no fim',
      );
    }

    if (RESERVED_DOMAINS.has(value)) {
      throw new InvalidTenantDomainError('Este domínio é reservado');
    }

    return new TenantDomain(value);
  }

  equals(other: TenantDomain): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
