const databaseUrl = process.env.E2E_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('E2E_DATABASE_URL debe apuntar a una base de pruebas desechable');
}

const databaseName = new URL(databaseUrl).pathname.slice(1);
if (databaseName !== 'pupuseria_e2e') {
  throw new Error('Las pruebas E2E solo pueden ejecutarse contra pupuseria_e2e');
}

process.env.DATABASE_URL = databaseUrl;

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.e2e.test.ts'],
  forceExit: true,
};
