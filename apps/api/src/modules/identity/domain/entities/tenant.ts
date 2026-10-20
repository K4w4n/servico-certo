import { InvalidTenantNameError } from '../errors/identity.errors.js';
import type { TenantDomain } from '../value-objects/tenant-domain.js';

export type TenantProps = {
  id: string;
  name: string;
  domain: TenantDomain;
  createdAt: Date;
  updatedAt: Date;
};

export class Tenant {
  private constructor(private readonly props: TenantProps) {}

  static create(input: { id: string; name: string; domain: TenantDomain; now: Date }): Tenant {
    return new Tenant({
      id: input.id,
      name: normalizeTenantName(input.name),
      domain: input.domain,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static restore(props: TenantProps): Tenant {
    return new Tenant(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get domain(): TenantDomain {
    return this.props.domain;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}

function normalizeTenantName(raw: string): string {
  const value = raw.trim().replace(/\s+/g, ' ');

  if (value.length < 1 || value.length > 120) {
    throw new InvalidTenantNameError();
  }

  return value;
}
