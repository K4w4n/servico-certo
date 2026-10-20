export function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

export function toNullableDate(value: Date | string | number | null | undefined): Date | null {
  return value === null || value === undefined ? null : toDate(value);
}
