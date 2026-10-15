import { Request, Response } from 'express';
import { pool } from '../config/database';

export const getInsumos = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM insumos ORDER BY nombre ASC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener inventario' });
  }
};

export const createInsumo = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { nombre, unidad_medida } = req.body;
    const cantidadDisponible = Number(req.body.cantidad_disponible ?? 0);
    const nivelMinimo = Number(req.body.nivel_minimo ?? 0);
    if (typeof nombre !== 'string' || !nombre.trim() || typeof unidad_medida !== 'string' || !unidad_medida.trim()) {
      res.status(400).json({ message: 'Nombre y unidad de medida son obligatorios' });
      return;
    }
    if (!Number.isFinite(cantidadDisponible) || cantidadDisponible < 0 || !Number.isFinite(nivelMinimo) || nivelMinimo < 0) {
      res.status(400).json({ message: 'Las cantidades deben ser números iguales o mayores que cero' });
      return;
    }

    await client.query('BEGIN');
    const result = await client.query(
      'INSERT INTO insumos (nombre, unidad_medida, cantidad_disponible, nivel_minimo) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre.trim(), unidad_medida.trim(), cantidadDisponible, nivelMinimo]
    );
    if (cantidadDisponible > 0) {
      await client.query(
        "INSERT INTO movimientos_inventario (insumo_id, tipo, cantidad, motivo, usuario_id) VALUES ($1, 'entrada', $2, 'Existencia inicial', $3)",
        [result.rows[0].id, cantidadDisponible, (req as any).user.id]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    if ((error as { code?: string }).code === '23505') {
      res.status(409).json({ message: 'Ya existe un insumo con ese nombre' });
      return;
    }
    res.status(500).json({ message: 'Error al crear insumo' });
  } finally {
    client.release();
  }
};

export const ajustarInsumo = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { cantidad, motivo, tipo } = req.body;
    const amount = Number(cantidad);
    const insumoId = Number(id);
    const tipoExplicito = tipo === 'agregar' || tipo === 'descontar';
    if (!Number.isInteger(insumoId) || insumoId <= 0 || !Number.isFinite(amount) || amount === 0 || (tipoExplicito && amount < 0) || (tipo !== undefined && !tipoExplicito)) {
      res.status(400).json({ message: 'Insumo o cantidad de ajuste inválidos' });
      return;
    }
    const delta = tipoExplicito ? (tipo === 'agregar' ? amount : -amount) : amount;

    await client.query('BEGIN');
    const insumo = await client.query('SELECT cantidad_disponible FROM insumos WHERE id = $1 FOR UPDATE', [insumoId]);
    if (insumo.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ message: 'Insumo no encontrado' });
      return;
    }

    const cantidadActual = Number(insumo.rows[0].cantidad_disponible);
    const nuevaCantidad = cantidadActual + delta;
    if (nuevaCantidad < 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ message: 'El ajuste no puede dejar existencias negativas' });
      return;
    }

    const userId = (req as any).user.id;
    const actualizado = await client.query(
      'UPDATE insumos SET cantidad_disponible = $1, actualizado_en = NOW() WHERE id = $2 RETURNING *',
      [nuevaCantidad, insumoId]
    );
    await client.query(
      'INSERT INTO movimientos_inventario (insumo_id, tipo, cantidad, motivo, usuario_id) VALUES ($1, $2, $3, $4, $5)',
      [insumoId, delta > 0 ? 'entrada' : 'salida', Math.abs(delta), motivo?.trim() || 'Ajuste manual', userId]
    );
    await client.query('COMMIT');

    res.json({ message: 'Inventario actualizado', insumo: actualizado.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Error al ajustar inventario' });
  } finally {
    client.release();
  }
};
