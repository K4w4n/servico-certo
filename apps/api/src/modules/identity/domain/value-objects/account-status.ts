export const ACCOUNT_STATUSES = ['ACTIVE', 'BLOCKED'] as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export function isAccountStatus(value: string): value is AccountStatus {
  return value === 'ACTIVE' || value === 'BLOCKED';
}
