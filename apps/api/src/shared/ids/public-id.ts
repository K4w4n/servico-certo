import type { PublicIdPrefix } from '@servico-certo/contracts';
import { parse, stringify, validate, version } from 'uuid';
import { AppError } from '../errors/app-error.js';

export class InvalidPublicIdError extends AppError {
  readonly code = 'INVALID_PUBLIC_ID';

  constructor(message = 'ID público inválido') {
    super(message);
  }
}

export function encodePublicId(prefix: PublicIdPrefix, uuid: string): string {
  if (!validate(uuid) || version(uuid) !== 7) {
    throw new InvalidPublicIdError('UUIDv7 inválido');
  }

  const bytes = parse(uuid);

  return `${prefix}_${Buffer.from(bytes).toString('base64url')}`;
}

export function decodePublicId(prefix: PublicIdPrefix, value: string): string {
  if (!value.startsWith(`${prefix}_`)) {
    throw new InvalidPublicIdError('Prefixo inválido');
  }

  const payload = value.slice(prefix.length + 1);

  if (!/^[A-Za-z0-9_-]{22}$/.test(payload)) {
    throw new InvalidPublicIdError('Payload inválido');
  }

  const bytes = Buffer.from(payload, 'base64url');

  if (bytes.length !== 16) {
    throw new InvalidPublicIdError('Tamanho inválido');
  }

  if (Buffer.from(bytes).toString('base64url') !== payload) {
    throw new InvalidPublicIdError('Base64url não canônico');
  }

  const uuid = stringify(bytes);

  if (!validate(uuid) || version(uuid) !== 7) {
    throw new InvalidPublicIdError('UUIDv7 inválido');
  }

  return uuid;
}
