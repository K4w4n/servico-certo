import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../../../../shared/application/ports/clock.js';
import {
  ID_GENERATOR,
  type IdGenerator,
} from '../../../../shared/application/ports/id-generator.js';
import { isUniqueViolation } from '../../../../shared/database/unique-violation.js';
import { Account } from '../../domain/entities/account.js';
import {
  ACCOUNT_REPOSITORY,
  type AccountRepository,
} from '../../domain/repositories/account.repository.js';
import { Email } from '../../domain/value-objects/email.js';
import { PasswordHash } from '../../domain/value-objects/password-hash.js';
import { EmailAlreadyInUseError } from '../errors/identity.errors.js';
import { PASSWORD_HASHER, type PasswordHasher } from '../ports/password-hasher.js';
import { assertPasswordStrength } from '../services/password-policy.js';

export type CreateAccountCommand = {
  tenantId: string;
  name: string;
  email: string;
  password: string;
};

@Injectable()
export class CreateAccountUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: CreateAccountCommand): Promise<Account> {
    const email = Email.create(command.email);
    assertPasswordStrength(command.password);

    const emailAlreadyExists = await this.accounts.existsByTenantAndEmail(
      command.tenantId,
      email.value,
    );

    if (emailAlreadyExists) {
      throw new EmailAlreadyInUseError();
    }

    const now = this.clock.now();

    const account = Account.create({
      id: this.ids.next(),
      tenantId: command.tenantId,
      name: command.name,
      email,
      passwordHash: PasswordHash.create(await this.passwordHasher.hash(command.password)),
      now,
    });

    try {
      await this.accounts.save(account);
    } catch (error) {
      if (isUniqueViolation(error, 'email')) {
        throw new EmailAlreadyInUseError();
      }

      throw error;
    }

    return account;
  }
}
