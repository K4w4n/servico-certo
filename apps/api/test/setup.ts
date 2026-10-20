process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret-32';
process.env.JWT_ISSUER ??= 'servico-certo';
process.env.JWT_AUDIENCE ??= 'servico-certo-web';
process.env.ACCESS_TOKEN_TTL_SECONDS ??= '900';
process.env.REFRESH_TOKEN_TTL_DAYS ??= '7';
process.env.COOKIE_DOMAIN = '';
