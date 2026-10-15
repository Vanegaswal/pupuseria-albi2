import { Request, Response } from 'express';
import { pool } from '../config/database';
import crypto from 'crypto';

export const getMesas = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM mesas ORDER BY numero_mesa');
    res.json(result.rows);
  } catch (error) {
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
      WHERE mesa_id = $1 AND estado IN ('abierta', 'pidiendo_cuenta')
      LIMIT 1
    `, [mesaId]);
    res.json(result.rows.length ? { activa: true, sesion: result.rows[0] } : { activa: false });
  } catch (error) {
    res.status(500).json({ message: 'Error al consultar la sesión de mesa' });
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
  try {
    const { id } = req.params;
    await pool.query("UPDATE sesiones_mesa SET estado = 'pidiendo_cuenta' WHERE mesa_id = $1 AND estado = 'abierta'", [id]);
    res.json({ message: 'Cuenta solicitada' });
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};
