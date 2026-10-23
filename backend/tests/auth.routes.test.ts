import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../src/app';
import { pool } from '../src/config/database';
import { AuthUserRecord, ProfileRecord } from '../src/dtos/auth.dto';

jest.mock('../src/config/database', () => ({
  pool: {
    query: jest.fn(),
    end: jest.fn()
  }
}));

const mockedQuery = jest.mocked(pool.query);
const jwtSecret = process.env.JWT_SECRET || 'super_secret_key_123';
const user: AuthUserRecord = {
  id: 'user-id',
  usuario: 'albi',
  password_hash: bcrypt.hashSync('secret', 4),
  nombres: 'Ana',
  apellidos: 'Albi',
  rol: 'Administrador'
};

const profile: ProfileRecord = {
  id: user.id,
  usuario: user.usuario,
  nombres: user.nombres,
  apellidos: user.apellidos,
  rol: user.rol
};

describe('QA de rutas de autenticación', () => {
  beforeEach(() => {
    mockedQuery.mockReset();
  });

  describe('POST /api/auth/login', () => {
    it.each<unknown>([
      undefined,
      null,
      {},
      { usuario: 'albi' },
      { usuario: 4, password: 'secret' },
      { usuario: '   ', password: 'secret' },
      { usuario: 'a'.repeat(51), password: 'secret' },
      { usuario: 'albi', password: '' }
    ])('rechaza credenciales con formato inválido: %p', async (body) => {
      const testRequest = request(app).post('/api/auth/login');
      if (body === null) {
        testRequest.set('Content-Type', 'application/json').send('null');
      } else if (body !== undefined) {
        testRequest.send(body as object);
      }

      const response = await testRequest;

      expect(response.status).toBe(400);
      if (body !== null) {
        expect(response.body).toEqual({ message: 'Los datos de acceso no son válidos' });
      }
      expect(mockedQuery).not.toHaveBeenCalled();
    });

    it('autentica credenciales válidas y devuelve el contrato esperado', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [user] } as never);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ usuario: '  albi ', password: 'secret' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        usuario: { id: user.id, nombre: 'Ana Albi', rol: user.rol }
      });
      expect(typeof response.body.token).toBe('string');
      expect(response.body).not.toHaveProperty('password_hash');
      expect(mockedQuery).toHaveBeenCalledWith(expect.any(String), ['albi']);

      const decoded = jwt.verify(response.body.token, jwtSecret);
      expect(decoded).toMatchObject({ id: user.id, usuario: user.usuario, rol: user.rol });
    });

    it('rechaza un usuario inexistente o inactivo', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [] } as never);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ usuario: 'inexistente', password: 'secret' });

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Credenciales inválidas/);
    });

    it('rechaza una contraseña incorrecta', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [user] } as never);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ usuario: 'albi', password: 'incorrecta' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: 'Credenciales inválidas' });
    });
  });

  describe('GET /api/auth/me', () => {
    it.each([undefined, 'invalid-token'])('rechaza token ausente o inválido: %p', async (token) => {
      const testRequest = request(app).get('/api/auth/me');
      if (token) {
        testRequest.set('Authorization', `Bearer ${token}`);
      }

      const response = await testRequest;

      expect(response.status).toBe(401);
      expect(mockedQuery).not.toHaveBeenCalled();
    });

    it('devuelve el perfil asociado al token válido', async () => {
      const token = jwt.sign(
        { id: user.id, usuario: user.usuario, rol: user.rol },
        jwtSecret,
        { expiresIn: '8h' }
      );
      mockedQuery.mockResolvedValueOnce({ rows: [profile] } as never);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(profile);
      expect(mockedQuery).toHaveBeenCalledWith(expect.any(String), [user.id]);
    });

    it('retorna 404 si el usuario del token ya no existe', async () => {
      const token = jwt.sign(
        { id: user.id, usuario: user.usuario, rol: user.rol },
        jwtSecret
      );
      mockedQuery.mockResolvedValueOnce({ rows: [] } as never);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Usuario no encontrado' });
    });
  });
});
