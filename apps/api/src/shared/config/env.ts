import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3001),
    CORS_ORIGIN: z.string().optional(),
    DATABASE_CLIENT: z.enum(['better-sqlite3', 'pg']).default('better-sqlite3'),
    DATABASE_URL: z.string().url().optional(),
    SQLITE_PATH: z.string().optional(),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres'),
    JWT_ISSUER: z.string().default('servico-certo'),
    JWT_AUDIENCE: z.string().default('servico-certo-web'),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
    COOKIE_DOMAIN: z.string().optional(),
    WEB_APP_URL: z.string().url().default('http://localhost:3000'),
    PASSWORD_RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(30),
    PASSWORD_RESET_RATE_LIMIT: z.coerce.number().int().positive().default(3),
    PASSWORD_RESET_RATE_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
    MAIL_TRANSPORT: z.enum(['console', 'smtp']).default('console'),
    MAIL_FROM: z.string().min(1).default('no-reply@servicocerto.local'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
  })
  .superRefine((env, context) => {
    if (env.MAIL_TRANSPORT === 'smtp' && !env.SMTP_HOST) {
      context.addIssue({
        code: 'custom',
        path: ['SMTP_HOST'],
        message: 'SMTP_HOST é obrigatório quando MAIL_TRANSPORT=smtp',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n');

    throw new Error(`Invalid environment variables:\n${details}`);
  }

  return parsed.data;
}
