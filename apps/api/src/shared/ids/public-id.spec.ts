import { randomUUID } from 'node:crypto';
import { PUBLIC_ID_PREFIXES, publicIdSchema } from '@servico-certo/contracts';
import { describe, expect, it } from 'vitest';
import { InvalidPublicIdError, decodePublicId, encodePublicId } from './public-id.js';

const UUID_V7 = '01a15724-a16e-7648-8eb5-5f329fcb6cfa';
const TENANT_PUBLIC_ID = 'ten_AaFXJKFudkiOtV8yn8ts-g';

describe('public-id', () => {
  it('codifica o vetor conhecido', () => {
    expect(encodePublicId(PUBLIC_ID_PREFIXES.tenant, UUID_V7)).toBe(TENANT_PUBLIC_ID);
  });

  it('faz round-trip', () => {
    const publicId = encodePublicId(PUBLIC_ID_PREFIXES.account, UUID_V7);

    expect(decodePublicId(PUBLIC_ID_PREFIXES.account, publicId)).toBe(UUID_V7);
  });

  it('é aceito pelo schema do contrato', () => {
    expect(publicIdSchema(PUBLIC_ID_PREFIXES.tenant).safeParse(TENANT_PUBLIC_ID).success).toBe(
      true,
    );
  });

  it('rejeita prefixo errado', () => {
    expect(() => decodePublicId(PUBLIC_ID_PREFIXES.tenant, 'acc_AaFXJKFudkiOtV8yn8ts-g')).toThrow(
      InvalidPublicIdError,
    );
  });

  it('rejeita payload com tamanho inválido', () => {
    expect(() => decodePublicId(PUBLIC_ID_PREFIXES.tenant, 'ten_short')).toThrow(
      InvalidPublicIdError,
    );
  });

  it('rejeita base64url não canônico', () => {
    expect(() => decodePublicId(PUBLIC_ID_PREFIXES.tenant, 'ten_AaFXJKFudkiOtV8yn8ts-h')).toThrow(
      InvalidPublicIdError,
    );
  });

  it('rejeita UUID que não é v7', () => {
    expect(() => encodePublicId(PUBLIC_ID_PREFIXES.tenant, randomUUID())).toThrow(
      InvalidPublicIdError,
    );
  });

  it('rejeita UUID malformado', () => {
    expect(() => encodePublicId(PUBLIC_ID_PREFIXES.tenant, 'not-a-uuid')).toThrow(
      InvalidPublicIdError,
    );
  });
});
