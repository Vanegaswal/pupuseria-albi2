import { Request, Response } from 'express';
import { pool } from '../config/database';
import crypto from 'crypto';

export const getMesas = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT m.*, sm.id AS sesion_id, sm.estado AS estado_sesion,
             sm.abierta_en AS sesion_abierta_en
      FROM mesas m
      LEFT JOIN sesiones_mesa sm
        ON sm.mesa_id = m.id AND sm.estado IN ('abierta', 'pidiendo_cuenta')
      ORDER BY m.numero_mesa
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener mesas' });
  }
};

export const getMesasPublicas = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT id, numero_mesa FROM mesas ORDER BY numero_mesa');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener mesas' });
  }
};

export const getSesionPublica = async (req: Request, res: Response): Promise<void> => {
  try {
    const mesaId = Number(req.params.id);
    if (!Number.isInteger(mesaId) || mesaId <= 0) {
      res.status(400).json({ message: 'Mesa inválida' });
      return;
    }
    const result = await pool.query(`
      SELECT id, mesa_id, cliente_nombre, estado
      FROM sesiones_mesa
      WHERE mesa_id = $1
      ORDER BY abierta_en DESC
      LIMIT 1
    `, [mesaId]);
    const ultimaSesion = result.rows[0] ?? null;
    const sesion = ultimaSesion
      ? ultimaSesion.estado === 'abierta'
        ? ultimaSesion
        : { estado: ultimaSesion.estado }
      : null;
    res.json({ activa: ultimaSesion?.estado === 'abierta', sesion });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al consultar la sesión de mesa' });
  }
};

export const abrirSesion = async (req: Request, res: Response): Promise<void> => {
  const mesaId = Number(req.params.id);
  if (!Number.isInteger(mesaId) || mesaId <= 0) {
    res.status(400).json({ message: 'Mesa inválida' });
    return;
  }

  const client = await pool.connect();
  let transactionStarted = false;
  try {
    await client.query('BEGIN');
    transactionStarted = true;

    const mesa = await client.query(
      'SELECT id FROM mesas WHERE id = $1 FOR UPDATE',
      [mesaId]
    );
    if (mesa.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      res.status(404).json({ message: 'Mesa no encontrada' });
      return;
    }

    const sesionActiva = await client.query(
      "SELECT id FROM sesiones_mesa WHERE mesa_id = $1 AND estado IN ('abierta', 'pidiendo_cuenta') LIMIT 1",
      [mesaId]
    );
    if (sesionActiva.rows.length > 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      res.status(409).json({ message: 'La mesa ya tiene una sesión activa o pendiente de cobro' });
      return;
    }

    const sesion = await client.query(
      "INSERT INTO sesiones_mesa (mesa_id, estado) VALUES ($1, 'abierta') RETURNING id, mesa_id, estado, abierta_en",
      [mesaId]
    );
    await client.query("UPDATE mesas SET estado = 'ocupada' WHERE id = $1", [mesaId]);
    await client.query('COMMIT');
    transactionStarted = false;

    res.status(201).json({
      message: 'Sesión abierta correctamente',
      sesion: sesion.rows[0]
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query('ROLLBACK');
    }
    if ((error as { code?: string }).code === '23505') {
      res.status(409).json({ message: 'La mesa ya tiene una sesión activa o pendiente de cobro' });
      return;
    }
    console.error(error);
    res.status(500).json({ message: 'Error al abrir la sesión de mesa' });
  } finally {
    client.release();
  }
};

export const createMesa = async (req: Request, res: Response) => {
  try {
    const { numero_mesa } = req.body;
    const codigo_qr = crypto.randomUUID();
    
    await pool.query(
      'INSERT INTO mesas (numero_mesa, codigo_qr) VALUES ($1, $2)',
      [numero_mesa, codigo_qr]
    );
    res.status(201).json({ message: 'Mesa creada' });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear mesa' });
  }
};

export const getMesaByQR = async (req: Request, res: Response): Promise<void> => {
  try {
    const { qr } = req.params;
    const result = await pool.query('SELECT * FROM mesas WHERE codigo_qr = $1', [qr]);
    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Mesa no encontrada' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};

export const solicitarCuenta = async (req: Request, res: Response): Promise<void> => {
  const mesaId = Number(req.params.id);
  if (!Number.isInteger(mesaId) || mesaId <= 0) {
    res.status(400).json({ message: 'Mesa inválida' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const mesa = await client.query('SELECT id FROM mesas WHERE id = $1 FOR UPDATE', [mesaId]);
    if (mesa.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ message: 'Mesa no encontrada' });
      return;
    }

    const sesion = await client.query(
      "SELECT id, estado FROM sesiones_mesa WHERE mesa_id = $1 AND estado IN ('abierta', 'pidiendo_cuenta') LIMIT 1 FOR UPDATE",
      [mesaId]
    );
    if (sesion.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(409).json({ message: 'La mesa no tiene una sesión abierta' });
      return;
    }
    if (sesion.rows[0].estado === 'pidiendo_cuenta') {
      await client.query('ROLLBACK');
      res.status(409).json({ message: 'La cuenta ya fue solicitada' });
      return;
    }

    await client.query(
      "UPDATE sesiones_mesa SET estado = 'pidiendo_cuenta' WHERE id = $1",
      [sesion.rows[0].id]
    );
    await client.query('COMMIT');
    res.json({ message: 'Cuenta solicitada; no se aceptarán más pedidos en esta sesión' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Error al solicitar la cuenta' });
  } finally {
    client.release();
  }
};
