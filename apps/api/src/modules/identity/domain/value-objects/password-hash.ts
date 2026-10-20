import { InvalidPasswordHashError } from '../errors/identity.errors.js';

const ARGON2ID_PREFIX = '$argon2id$';

export class PasswordHash {
  private constructor(readonly value: string) {}

  static create(value: string): PasswordHash {
    if (!value.startsWith(ARGON2ID_PREFIX) || value.length > 255) {
      throw new InvalidPasswordHashError();
    }

    return new PasswordHash(value);
  }

  toString(): string {
    return this.value;
  }
}
