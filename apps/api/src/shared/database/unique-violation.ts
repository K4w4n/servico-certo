type DatabaseError = {
  code?: string;
  constraint?: string;
  detail?: string;
  message?: string;
};

export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  if (error === null || typeof error !== 'object') {
    return false;
  }

  const databaseError = error as DatabaseError;
  const isUnique =
    databaseError.code === '23505' ||
    databaseError.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
    databaseError.message?.includes('UNIQUE constraint failed') === true;

  if (!isUnique) {
    return false;
  }

  if (!constraint) {
    return true;
  }

  const haystack = [databaseError.constraint, databaseError.detail, databaseError.message]
    .filter(Boolean)
    .join(' ');

  return haystack.includes(constraint);
}
