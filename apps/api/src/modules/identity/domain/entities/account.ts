import { InvalidAccountNameError } from '../errors/identity.errors.js';
import type { Email } from '../value-objects/email.js';
import type { PasswordHash } from '../value-objects/password-hash.js';

export type AccountProps = {
  id: string;
  tenantId: string;
  name: string;
  email: Email;
  passwordHash: PasswordHash;
  createdAt: Date;
  updatedAt: Date;
};

export class Account {
  private constructor(private readonly props: AccountProps) {}

  static create(input: {
    id: string;
    tenantId: string;
    name: string;
    email: Email;
    passwordHash: PasswordHash;
    now: Date;
  }): Account {
    return new Account({
      id: input.id,
      tenantId: input.tenantId,
      name: normalizeAccountName(input.name),
      email: input.email,
      passwordHash: input.passwordHash,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static restore(props: AccountProps): Account {
    return new Account(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get name(): string {
    return this.props.name;
  }

  get email(): Email {
    return this.props.email;
  }

  get passwordHash(): PasswordHash {
    return this.props.passwordHash;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}

function normalizeAccountName(raw: string): string {
  const value = raw.trim().replace(/\s+/g, ' ');

  if (value.length < 1 || value.length > 120) {
    throw new InvalidAccountNameError();
  }

  return value;
}
