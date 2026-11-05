import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../src/app';
import { pool } from '../src/config/database';

jest.mock('../src/config/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn()
  }
}));

const mockEmittedEvents = jest.fn();
jest.mock('../src/sockets/socket', () => ({
  getIO: () => ({
    to: () => ({ emit: mockEmittedEvents }),
    emit: mockEmittedEvents
  })
}));

const mockedConnect = jest.mocked(pool.connect);
const mockedQuery = jest.mocked(pool.query);
const jwtSecret = process.env.JWT_SECRET || 'super_secret_key_123';

function staffToken(rol: string): string {
  return jwt.sign({ id: 'staff-id', usuario: 'qa-staff', rol }, jwtSecret);
}

function mockClient(responses: unknown[]) {
  const query = jest.fn();
  for (const rows of responses) {
    query.mockResolvedValueOnce({ rows } as never);
  }
  const client = { query, release: jest.fn() };
  mockedConnect.mockResolvedValueOnce(client as never);
  return client;
}

describe('Autorización de sesiones y pedidos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no considera habilitada una sesión pendiente de cobro en la consulta pública', async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [{ id: 8, numero_mesa: 2 }]
    } as never).mockResolvedValueOnce({
      rows: [{ id: 'session-id', mesa_id: 8, cliente_nombre: 'QA', estado: 'pidiendo_cuenta' }]
    } as never);

    const response = await request(app).get('/api/mesas/8/sesion-publica');

    expect(response.status).toBe(200);
    expect(response.body.mesa).toEqual({ id: 8, numero_mesa: 2 });
    expect(response.body.activa).toBe(false);
    expect(response.body.sesion.estado).toBe('pidiendo_cuenta');
  });

  describe('POST /api/mesas/:id/abrir-sesion', () => {
    it('exige autenticación', async () => {
      const response = await request(app).post('/api/mesas/8/abrir-sesion');

      expect(response.status).toBe(401);
      expect(mockedConnect).not.toHaveBeenCalled();
    });

    it('rechaza un rol no autorizado', async () => {
      const response = await request(app)
        .post('/api/mesas/8/abrir-sesion')
        .set('Authorization', `Bearer ${staffToken('Cajero')}`);

      expect(response.status).toBe(403);
      expect(mockedConnect).not.toHaveBeenCalled();
    });

    it('permite a un mesero abrir una sesión y ocupa la mesa', async () => {
      const client = mockClient([
        [],
        [{ id: 8 }],
        [],
        [{ id: 'session-id', mesa_id: 8, estado: 'abierta', abierta_en: '2026-10-23T12:00:00Z' }],
        [],
        []
      ]);

      const response = await request(app)
        .post('/api/mesas/8/abrir-sesion')
        .set('Authorization', `Bearer ${staffToken('Mesero')}`);

      expect(response.status).toBe(201);
      expect(response.body.sesion).toMatchObject({ id: 'session-id', mesa_id: 8, estado: 'abierta' });
      expect(client.query.mock.calls.map(([sql]) => sql)).toEqual([
        'BEGIN',
        'SELECT id FROM mesas WHERE id = $1 FOR UPDATE',
        expect.stringContaining("estado IN ('abierta', 'pidiendo_cuenta')"),
        expect.stringContaining('INSERT INTO sesiones_mesa'),
        "UPDATE mesas SET estado = 'ocupada' WHERE id = $1",
        'COMMIT'
      ]);
      expect(client.release).toHaveBeenCalled();
    });

    it('rechaza una mesa con sesión activa sin modificar la sesión', async () => {
      const client = mockClient([[], [{ id: 8 }], [{ id: 'existing-session' }], []]);

      const response = await request(app)
        .post('/api/mesas/8/abrir-sesion')
        .set('Authorization', `Bearer ${staffToken('Administrador')}`);

      expect(response.status).toBe(409);
      expect(client.query).toHaveBeenCalledTimes(4);
      expect(client.query.mock.calls[3][0]).toBe('ROLLBACK');
    });

    it('retorna 404 cuando la mesa no existe', async () => {
      const client = mockClient([[], []]);

      const response = await request(app)
        .post('/api/mesas/999/abrir-sesion')
        .set('Authorization', `Bearer ${staffToken('Administrador')}`);

      expect(response.status).toBe(404);
      expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
    });

    it('rechaza un identificador de mesa inválido', async () => {
      const response = await request(app)
        .post('/api/mesas/0/abrir-sesion')
        .set('Authorization', `Bearer ${staffToken('Administrador')}`);

      expect(response.status).toBe(400);
      expect(mockedConnect).not.toHaveBeenCalled();
    });

    it('traduce una colisión del índice único en conflicto de sesión activa', async () => {
      const query = jest.fn();
      query.mockResolvedValueOnce({ rows: [] } as never);
      query.mockResolvedValueOnce({ rows: [{ id: 8 }] } as never);
      query.mockResolvedValueOnce({ rows: [] } as never);
      query.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: '23505' }));
      query.mockResolvedValueOnce({ rows: [] } as never);
      const client = { query, release: jest.fn() };
      mockedConnect.mockResolvedValueOnce(client as never);

      const response = await request(app)
        .post('/api/mesas/8/abrir-sesion')
        .set('Authorization', `Bearer ${staffToken('Administrador')}`);

      expect(response.status).toBe(409);
      expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
    });
  });

  describe('POST /api/pedidos', () => {
    const pedido = (tipo_pedido = 'mesa', origen = 'qr') => ({
      mesa_id: 8,
      tipo_pedido,
      origen,
      cliente_nombre: 'QA',
      detalles: [{ producto_id: 3, cantidad: 2, precio_unitario: 0.01 }]
    });

    it('rechaza pedidos sin sesión y no crea sesiones automáticamente', async () => {
      const client = mockClient([[], [{ id: 8, numero_mesa: 8 }], [], []]);

      const response = await request(app).post('/api/pedidos').send(pedido());

      expect(response.status).toBe(409);
      expect(response.body.message).toMatch(/no está habilitada/);
      expect(client.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO sesiones_mesa'))).toBe(false);
      expect(client.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO pedidos'))).toBe(false);
      expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
    });

    it('rechaza pedidos cuando la sesión está pendiente de cobro', async () => {
      const client = mockClient([
        [],
        [{ id: 8, numero_mesa: 8 }],
        [{ id: 'session-id', estado: 'pidiendo_cuenta', cliente_nombre: 'QA' }],
        []
      ]);

      const response = await request(app).post('/api/pedidos').send(pedido());

      expect(response.status).toBe(409);
      expect(response.body.message).toMatch(/pendiente de cobro/);
      expect(client.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO pedidos'))).toBe(false);
    });

    it('acepta pedidos de mesa en sesión abierta, ignora el origen enviado y notifica a cocina', async () => {
      const client = mockClient([
        [],
        [{ id: 8, numero_mesa: 8 }],
        [{ id: 'session-id', estado: 'abierta', cliente_nombre: 'QA' }],
        [{ id: 'order-id', creado_en: '2026-10-23T12:00:00Z' }],
        [{ id: 3, nombre: 'Pupusa', precio: '1.25' }],
        [],
        [],
        [],
        []
      ]);

      const response = await request(app).post('/api/pedidos').send(pedido('mesa', 'inventado'));

      expect(response.status).toBe(201);
      expect(client.query.mock.calls[3][1]).toEqual(['session-id', 'qr', 'mesa', 'pendiente']);
      expect(client.query.mock.calls[4][0]).toContain('p.disponible = true');
      expect(client.query.mock.calls[5][1]).toEqual(['order-id', 3, 2, 1.25, 2.5, '']);
      expect(client.query.mock.calls[6][1]).toEqual([2.5, 'order-id']);
      expect(client.query.mock.calls[7][1]).toEqual([2.5, 'session-id']);
      expect(client.query.mock.calls[8][0]).toBe('COMMIT');
      expect(mockEmittedEvents).toHaveBeenCalledWith('nuevo_pedido', expect.objectContaining({
        id: 'order-id',
        origen: 'qr',
        tipo_pedido: 'mesa'
      }));
    });

    it('conserva los pedidos para llevar anexados a la sesión abierta', async () => {
      mockClient([
        [],
        [{ id: 8, numero_mesa: 8 }],
        [{ id: 'session-id', estado: 'abierta', cliente_nombre: 'QA' }],
        [{ id: 'order-id', creado_en: '2026-10-23T12:00:00Z' }],
        [{ id: 3, nombre: 'Pupusa', precio: '1.25' }],
        [],
        [],
        [],
        []
      ]);

      const response = await request(app).post('/api/pedidos').send(pedido('llevar'));

      expect(response.status).toBe(201);
      expect(mockEmittedEvents).toHaveBeenCalledWith('nuevo_pedido', expect.objectContaining({
        tipo_pedido: 'llevar'
      }));
    });

    it('rechaza un producto no disponible y revierte la transacción', async () => {
      const client = mockClient([
        [],
        [{ id: 8, numero_mesa: 8 }],
        [{ id: 'session-id', estado: 'abierta', cliente_nombre: 'QA' }],
        [{ id: 'order-id', creado_en: '2026-10-23T12:00:00Z' }],
        []
      ]);

      const response = await request(app).post('/api/pedidos').send(pedido());

      expect(response.status).toBe(409);
      expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
      expect(client.query.mock.calls.some(([sql]) => sql === 'COMMIT')).toBe(false);
    });

    it('revierte la transacción si falla una consulta al registrar el pedido', async () => {
      const query = jest.fn();
      query.mockResolvedValueOnce({ rows: [] } as never);
      query.mockResolvedValueOnce({ rows: [{ id: 8, numero_mesa: 8 }] } as never);
      query.mockResolvedValueOnce({ rows: [{ id: 'session-id', estado: 'abierta', cliente_nombre: 'QA' }] } as never);
      query.mockRejectedValueOnce(new Error('database write failed'));
      query.mockResolvedValueOnce({ rows: [] } as never);
      const client = { query, release: jest.fn() };
      mockedConnect.mockResolvedValueOnce(client as never);
      const logError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

      const response = await request(app).post('/api/pedidos').send(pedido());

      expect(response.status).toBe(500);
      expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
      expect(client.query.mock.calls.some(([sql]) => sql === 'COMMIT')).toBe(false);
      expect(client.release).toHaveBeenCalled();
      logError.mockRestore();
    });
  });

  describe('POST /api/mesas/:id/solicitar-cuenta', () => {
    it('solo permite que una sesión abierta solicite la cuenta una vez', async () => {
      const client = mockClient([[], [{ id: 8 }], [{ id: 'session-id', estado: 'abierta' }], [], []]);

      const response = await request(app).post('/api/mesas/8/solicitar-cuenta');

      expect(response.status).toBe(200);
      expect(client.query.mock.calls[3][0]).toContain("SET estado = 'pidiendo_cuenta'");
      expect(client.query).toHaveBeenLastCalledWith('COMMIT');
    });

    it('rechaza solicitudes repetidas', async () => {
      const client = mockClient([[], [{ id: 8 }], [{ id: 'session-id', estado: 'pidiendo_cuenta' }], []]);

      const response = await request(app).post('/api/mesas/8/solicitar-cuenta');

      expect(response.status).toBe(409);
      expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
    });
  });
});
