import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../src/app';
import { pool } from '../src/config/database';

jest.mock('../src/sockets/socket', () => ({
  getIO: () => ({
    to: () => ({ emit: jest.fn() }),
    emit: jest.fn()
  })
}));

const testCategoryName = `E2E_Sesiones_QA_${randomUUID()}`;
const testTableNumber = 980000 + Math.floor(Math.random() * 1000);
const testQr = `e2e-${randomUUID()}`;
const jwtSecret = process.env.JWT_SECRET || 'super_secret_key_123';
let tableId: number;
let productId: number;
let categoryId: number;
let cashShiftId: string;

function staffToken(rol: string): string {
  return jwt.sign({ id: randomUUID(), usuario: 'qa-staff', rol }, jwtSecret);
}

describe('E2E de autorización de sesión de mesa', () => {
  beforeAll(async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mesas (
        id SERIAL PRIMARY KEY,
        numero_mesa INT UNIQUE NOT NULL,
        codigo_qr VARCHAR(255) UNIQUE NOT NULL,
        estado VARCHAR(20) DEFAULT 'disponible'
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS turnos_caja (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        monto_apertura DECIMAL(10,2) NOT NULL DEFAULT 0,
        estado VARCHAR(20) NOT NULL DEFAULT 'abierto',
        abierto_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        cerrado_en TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sesiones_mesa (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mesa_id INT REFERENCES mesas(id) ON DELETE SET NULL,
        turno_caja_id UUID,
        cliente_nombre VARCHAR(100),
        estado VARCHAR(20) NOT NULL DEFAULT 'abierta',
        total DECIMAL(10,2) DEFAULT 0.00,
        abierta_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        cerrada_en TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recetas (
        producto_id INT NOT NULL,
        insumo_id INT NOT NULL,
        cantidad_requerida DECIMAL(10,4) NOT NULL
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS insumos (
        id SERIAL PRIMARY KEY,
        cantidad_disponible DECIMAL(10,2) DEFAULT 0
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS movimientos_inventario (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        insumo_id INT,
        tipo VARCHAR(20) NOT NULL,
        cantidad DECIMAL(10,2) NOT NULL,
        motivo TEXT
      )
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_sesiones_mesa_una_activa
      ON sesiones_mesa(mesa_id)
      WHERE mesa_id IS NOT NULL AND estado IN ('abierta', 'pidiendo_cuenta')
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) UNIQUE NOT NULL,
        activa BOOLEAN DEFAULT true
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id SERIAL PRIMARY KEY,
        categoria_id INT REFERENCES categorias(id) ON DELETE RESTRICT,
        nombre VARCHAR(100) NOT NULL,
        precio DECIMAL(10,2) NOT NULL,
        disponible BOOLEAN DEFAULT true
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sesion_mesa_id UUID REFERENCES sesiones_mesa(id) ON DELETE CASCADE,
        tipo_pedido VARCHAR(20) NOT NULL DEFAULT 'mesa',
        estado VARCHAR(20) DEFAULT 'pendiente',
        origen VARCHAR(20) DEFAULT 'qr',
        total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS detalles_pedido (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
        producto_id INT REFERENCES productos(id) ON DELETE RESTRICT,
        cantidad INT NOT NULL DEFAULT 1,
        precio_unitario DECIMAL(10,2) NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        observaciones TEXT,
        estado VARCHAR(20) DEFAULT 'pendiente'
      )
    `);

    const category = await pool.query<{ id: number }>(
      "INSERT INTO categorias (nombre, activa) VALUES ($1, true) RETURNING id",
      [testCategoryName]
    );
    categoryId = category.rows[0].id;
    const product = await pool.query<{ id: number }>(
      'INSERT INTO productos (categoria_id, nombre, precio, disponible) VALUES ($1, $2, $3, true) RETURNING id',
      [categoryId, 'Producto E2E', 1.25]
    );
    productId = product.rows[0].id;
    const cashShift = await pool.query<{ id: string }>(
      "INSERT INTO turnos_caja (monto_apertura, estado) VALUES (0, 'abierto') RETURNING id"
    );
    cashShiftId = cashShift.rows[0].id;
    const mesa = await pool.query<{ id: number }>(
      'INSERT INTO mesas (numero_mesa, codigo_qr) VALUES ($1, $2) RETURNING id',
      [testTableNumber, testQr]
    );
    tableId = mesa.rows[0].id;
  });

  afterAll(async () => {
    if (tableId) {
      await pool.query('DELETE FROM detalles_pedido WHERE pedido_id IN (SELECT id FROM pedidos WHERE sesion_mesa_id IN (SELECT id FROM sesiones_mesa WHERE mesa_id = $1))', [tableId]);
      await pool.query('DELETE FROM pedidos WHERE sesion_mesa_id IN (SELECT id FROM sesiones_mesa WHERE mesa_id = $1)', [tableId]);
      await pool.query('DELETE FROM sesiones_mesa WHERE mesa_id = $1', [tableId]);
      await pool.query('DELETE FROM mesas WHERE id = $1', [tableId]);
    }
    if (productId) {
      await pool.query('DELETE FROM productos WHERE id = $1', [productId]);
    }
    if (categoryId) {
      await pool.query('DELETE FROM categorias WHERE id = $1', [categoryId]);
    }
    if (cashShiftId) {
      await pool.query('DELETE FROM turnos_caja WHERE id = $1', [cashShiftId]);
    }
    await pool.end();
  });

  it('abre la sesión, acepta pedidos durante su vigencia y bloquea QR al solicitar cuenta o pagar', async () => {
    const openResponse = await request(app)
      .post(`/api/mesas/${tableId}/abrir-sesion`)
      .set('Authorization', `Bearer ${staffToken('Mesero')}`);

    expect(openResponse.status).toBe(201);
    const sessionId = openResponse.body.sesion.id as string;

    const duplicateResponse = await request(app)
      .post(`/api/mesas/${tableId}/abrir-sesion`)
      .set('Authorization', `Bearer ${staffToken('Administrador')}`);
    expect(duplicateResponse.status).toBe(409);

    const orderResponse = await request(app).post('/api/pedidos').send({
      mesa_id: tableId,
      tipo_pedido: 'mesa',
      origen: 'cliente-falsificado',
      detalles: [{ producto_id: productId, cantidad: 2 }]
    });
    expect(orderResponse.status).toBe(201);

    const orderRecord = await pool.query<{ origen: string; total: string }>(
      'SELECT origen, total FROM pedidos WHERE id = $1',
      [orderResponse.body.id]
    );
    expect(orderRecord.rows[0]).toEqual({ origen: 'qr', total: '2.50' });

    const requestBillResponse = await request(app).post(`/api/mesas/${tableId}/solicitar-cuenta`);
    expect(requestBillResponse.status).toBe(200);
    const blockedOrder = await request(app).post('/api/pedidos').send({
      mesa_id: tableId,
      detalles: [{ producto_id: productId, cantidad: 1 }]
    });
    expect(blockedOrder.status).toBe(409);

    const paymentResponse = await request(app)
      .post(`/api/caja/cobrar/${sessionId}`)
      .set('Authorization', `Bearer ${staffToken('Cajero')}`);
    expect(paymentResponse.status).toBe(200);

    const closedSession = await pool.query<{ estado: string }>(
      'SELECT estado FROM sesiones_mesa WHERE id = $1',
      [sessionId]
    );
    expect(closedSession.rows[0].estado).toBe('pagada');

    const mesaStatus = await pool.query<{ estado: string }>(
      'SELECT estado FROM mesas WHERE id = $1',
      [tableId]
    );
    expect(mesaStatus.rows[0].estado).toBe('disponible');

    const closedQrOrder = await request(app).post('/api/pedidos').send({
      mesa_id: tableId,
      detalles: [{ producto_id: productId, cantidad: 1 }]
    });
    expect(closedQrOrder.status).toBe(409);

    const newSessionResponse = await request(app)
      .post(`/api/mesas/${tableId}/abrir-sesion`)
      .set('Authorization', `Bearer ${staffToken('Administrador')}`);
    expect(newSessionResponse.status).toBe(201);

    const publicSession = await request(app).get(`/api/mesas/${tableId}/sesion-publica`);
    expect(publicSession.status).toBe(200);
    expect(publicSession.body).toMatchObject({
      activa: true,
      sesion: { estado: 'abierta' }
    });
  });
});
