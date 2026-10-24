export function normalizeDocument(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function normalizePhoneNumber(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatDocument(value: string): string {
  const document = normalizeDocument(value);

  if (document.length === 11) {
    return document.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }

  if (document.length === 14) {
    return document.replace(
      /^([A-Z0-9]{2})([A-Z0-9]{3})([A-Z0-9]{3})([A-Z0-9]{4})(\d{2})$/,
      '$1.$2.$3/$4-$5',
    );
  }

  return document;
}

export function formatPhoneNumber(value: string): string {
  const phone = normalizePhoneNumber(value);

  if (phone.length === 11) {
    return phone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }

  if (phone.length === 10) {
    return phone.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }

  return phone;
}
