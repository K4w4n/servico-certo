import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, jwtVerify } from 'jose';
import { v7 } from 'uuid';
import type {
  AccessTokenPayload,
  IssuedAccessToken,
  TokenIssuer,
} from '../../application/ports/token-issuer.js';

@Injectable()
export class JoseTokenIssuer implements TokenIssuer {
  private readonly secret: Uint8Array;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly ttlSeconds: number;

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.secret = new TextEncoder().encode(config.getOrThrow<string>('JWT_SECRET'));
    this.issuer = config.getOrThrow<string>('JWT_ISSUER');
    this.audience = config.getOrThrow<string>('JWT_AUDIENCE');
    this.ttlSeconds = Number(config.getOrThrow('ACCESS_TOKEN_TTL_SECONDS'));
  }

  async issue(payload: AccessTokenPayload): Promise<IssuedAccessToken> {
    const now = Math.floor(Date.now() / 1000);

    const token = await new SignJWT({ tid: payload.tenantId })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(payload.accountId)
      .setJti(v7())
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setIssuedAt(now)
      .setExpirationTime(now + this.ttlSeconds)
      .sign(this.secret);

    return { token, expiresIn: this.ttlSeconds };
  }

  async verify(token: string): Promise<AccessTokenPayload> {
    const { payload } = await jwtVerify(token, this.secret, {
      issuer: this.issuer,
      audience: this.audience,
      algorithms: ['HS256'],
    });

    if (typeof payload.sub !== 'string' || typeof payload.tid !== 'string') {
      throw new Error('Invalid access token payload');
    }

    return {
      accountId: payload.sub,
      tenantId: payload.tid,
    };
  }
}
