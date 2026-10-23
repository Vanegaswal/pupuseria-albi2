import bcrypt from 'bcryptjs';
import request from 'supertest';
import app from '../src/app';
import { pool } from '../src/config/database';

const testUsername = 'qa_auth_user';
const testPassword = 'qa-password-only';
const testRole = 'E2E_QA_Admin';
let testUserId: string;
let testRoleId: number;

describe('E2E autenticación con PostgreSQL real', () => {
  beforeAll(async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(50) UNIQUE NOT NULL,
        descripcion TEXT
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id UUID PRIMARY KEY,
        nombres VARCHAR(100) NOT NULL,
        apellidos VARCHAR(100) NOT NULL,
        usuario VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        rol_id INT REFERENCES roles(id) ON DELETE RESTRICT,
        activo BOOLEAN DEFAULT true
      )
    `);

    const roleResult = await pool.query<{ id: number }>(
      `INSERT INTO roles (nombre) VALUES ($1)
       ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
       RETURNING id`,
      [testRole]
    );
    testRoleId = roleResult.rows[0].id;

    const userResult = await pool.query<{ id: string }>(
      `INSERT INTO usuarios (id, nombres, apellidos, usuario, password_hash, rol_id, activo)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true)
       ON CONFLICT (usuario) DO UPDATE
       SET nombres = EXCLUDED.nombres,
           apellidos = EXCLUDED.apellidos,
           password_hash = EXCLUDED.password_hash,
           rol_id = EXCLUDED.rol_id,
           activo = true
       RETURNING id`,
      [
        'QA',
        'Tester',
        testUsername,
        await bcrypt.hash(testPassword, 4),
        testRoleId
      ]
    );
    testUserId = userResult.rows[0].id;
  });

  afterAll(async () => {
    if (testUserId) {
      await pool.query('DELETE FROM usuarios WHERE id = $1', [testUserId]);
    }
    if (testRoleId) {
      await pool.query('DELETE FROM roles WHERE id = $1', [testRoleId]);
    }
    await pool.end();
  });

  it('completa el ciclo real login → token → perfil', async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ usuario: testUsername, password: testPassword });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toMatchObject({
      usuario: {
        id: testUserId,
        nombre: 'QA Tester',
        rol: testRole
      }
    });
    expect(typeof loginResponse.body.token).toBe('string');
    expect(loginResponse.body).not.toHaveProperty('password_hash');

    const profileResponse = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.token}`);

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body).toEqual({
      id: testUserId,
      usuario: testUsername,
      nombres: 'QA',
      apellidos: 'Tester',
      rol: testRole
    });
  });

  it('rechaza credenciales incorrectas contra PostgreSQL', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ usuario: testUsername, password: 'incorrecta' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Credenciales inválidas' });
  });

  it('rechaza un token inválido antes de consultar el perfil', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token-invalido');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Token inválido o expirado' });
  });
});
