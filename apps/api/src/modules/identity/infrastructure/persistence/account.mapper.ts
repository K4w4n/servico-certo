import { toDate } from '../../../../shared/database/date.js';
import { Account } from '../../domain/entities/account.js';
import { isAccountStatus } from '../../domain/value-objects/account-status.js';
import { Email } from '../../domain/value-objects/email.js';
import { PasswordHash } from '../../domain/value-objects/password-hash.js';

export type AccountRow = {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  password_hash: string;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
};

export const accountMapper = {
  toDomain(row: AccountRow): Account {
    return Account.restore({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      email: Email.create(row.email),
      passwordHash: PasswordHash.create(row.password_hash),
      status: isAccountStatus(row.status) ? row.status : 'ACTIVE',
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
    });
  },

  toPersistence(account: Account): AccountRow {
    return {
      id: account.id,
      tenant_id: account.tenantId,
      name: account.name,
      email: account.email.value,
      password_hash: account.passwordHash.value,
      status: account.status,
      created_at: account.createdAt,
      updated_at: account.updatedAt,
    };
  },
};
