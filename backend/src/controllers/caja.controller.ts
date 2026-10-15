import { Request, Response } from 'express';
import { pool } from '../config/database';
import { getIO } from '../sockets/socket';

export const estadoTurno = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query("SELECT * FROM turnos_caja WHERE estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1");
    if (result.rows.length === 0) {
      res.json({ activo: false });
      return;
    }
    
    // Calcular ventas del turno
    const ventasResult = await pool.query("SELECT COALESCE(SUM(total), 0) as total_ventas FROM sesiones_mesa WHERE turno_caja_id = $1", [result.rows[0].id]);
    
    res.json({ 
      activo: true, 
      turno: result.rows[0],
      ventas_turno: parseFloat(ventasResult.rows[0].total_ventas),
      esperado: parseFloat(result.rows[0].monto_apertura) + parseFloat(ventasResult.rows[0].total_ventas)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al verificar turno' });
  }
};

export const getHistorialTurnos = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT
        t.id,
        t.estado,
        t.abierto_en,
        t.cerrado_en,
        t.monto_apertura,
        t.monto_cierre_esperado,
        t.monto_cierre_real,
        CONCAT_WS(' ', u.nombres, u.apellidos) AS usuario_nombre,
        COALESCE(SUM(sm.total) FILTER (WHERE sm.estado = 'pagada'), 0) AS ventas_totales,
        COALESCE(
          t.monto_cierre_real,
          t.monto_cierre_esperado,
          t.monto_apertura + COALESCE(SUM(sm.total) FILTER (WHERE sm.estado = 'pagada'), 0)
        ) AS monto_final
      FROM turnos_caja t
      LEFT JOIN usuarios u ON u.id = t.usuario_id
      LEFT JOIN sesiones_mesa sm ON sm.turno_caja_id = t.id
      GROUP BY t.id, u.nombres, u.apellidos
      ORDER BY t.abierto_en DESC
    `);
    res.json(result.rows.map(turno => ({
      ...turno,
      monto_apertura: Number(turno.monto_apertura),
      ventas_totales: Number(turno.ventas_totales),
      monto_cierre_esperado: turno.monto_cierre_esperado === null ? null : Number(turno.monto_cierre_esperado),
      monto_cierre_real: turno.monto_cierre_real === null ? null : Number(turno.monto_cierre_real),
      monto_final: Number(turno.monto_final)
    })));
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el historial de caja' });
  }
};

export const abrirTurno = async (req: Request, res: Response): Promise<void> => {
  try {
    const { monto_apertura } = req.body;
    const usuario_id = (req as any).user.id;
    
    const activo = await pool.query("SELECT id FROM turnos_caja WHERE estado = 'abierto'");
    if (activo.rows.length > 0) {
      res.status(400).json({ message: 'Ya existe un turno abierto' });
      return;
    }
    
    await pool.query("INSERT INTO turnos_caja (usuario_id, monto_apertura) VALUES ($1, $2)", [usuario_id, monto_apertura]);
    res.json({ message: 'Turno abierto exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al abrir turno' });
  }
};

export const cerrarTurno = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const turno = await client.query("SELECT id, monto_apertura FROM turnos_caja WHERE estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1 FOR UPDATE");
    if (turno.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ message: 'No hay turno de caja abierto' });
      return;
    }

    const ventas = await client.query("SELECT COALESCE(SUM(total) FILTER (WHERE estado = 'pagada'), 0) AS total_ventas FROM sesiones_mesa WHERE turno_caja_id = $1", [turno.rows[0].id]);
    const montoCierre = Number(turno.rows[0].monto_apertura) + Number(ventas.rows[0].total_ventas);
    await client.query(
      "UPDATE turnos_caja SET estado = 'cerrado', cerrado_en = NOW(), monto_cierre_esperado = $1, monto_cierre_real = $1 WHERE id = $2",
      [montoCierre, turno.rows[0].id]
    );
    await client.query('COMMIT');
    res.json({
      message: 'Turno cerrado exitosamente',
      turno: {
        id: turno.rows[0].id,
        monto_apertura: Number(turno.rows[0].monto_apertura),
        ventas_totales: Number(ventas.rows[0].total_ventas),
        monto_final: montoCierre
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Error al cerrar turno' });
  } finally {
    client.release();
  }
};

export const getCuentasAbiertas = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT sm.id as sesion_id, sm.total, sm.abierta_en, m.numero_mesa, m.id as mesa_id, sm.cliente_nombre, sm.estado as estado_sesion
      FROM sesiones_mesa sm
      JOIN mesas m ON sm.mesa_id = m.id
      WHERE sm.estado IN ('abierta', 'pidiendo_cuenta')
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener cuentas' });
  }
};

export const getDetalleCuenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sesion_id } = req.params;
    const sesion = await pool.query(`
      SELECT sm.id AS sesion_id, sm.total, sm.cliente_nombre, sm.estado, m.numero_mesa
      FROM sesiones_mesa sm
      JOIN mesas m ON m.id = sm.mesa_id
      WHERE sm.id = $1 AND sm.estado IN ('abierta', 'pidiendo_cuenta')
    `, [sesion_id]);
    if (!sesion.rows.length) {
      res.status(404).json({ message: 'Cuenta activa no encontrada' });
      return;
    }

    const detalles = await pool.query(`
      SELECT p.id AS pedido_id, p.tipo_pedido, p.creado_en AS pedido_creado_en,
             dp.id AS detalle_id, dp.cantidad, dp.precio_unitario, dp.subtotal,
             dp.observaciones, pr.nombre AS producto_nombre
      FROM pedidos p
      JOIN detalles_pedido dp ON dp.pedido_id = p.id
      JOIN productos pr ON pr.id = dp.producto_id
      WHERE p.sesion_mesa_id = $1 AND p.estado <> 'cancelado'
      ORDER BY p.creado_en, dp.id
    `, [sesion_id]);

    const pedidos = new Map<string, any>();
    for (const row of detalles.rows) {
      if (!pedidos.has(row.pedido_id)) {
        pedidos.set(row.pedido_id, {
          id: row.pedido_id,
          tipo_pedido: row.tipo_pedido,
          creado_en: row.pedido_creado_en,
          total: 0,
          detalles: []
        });
      }
      const pedido = pedidos.get(row.pedido_id);
      pedido.total += Number(row.subtotal);
      pedido.detalles.push({
        id: row.detalle_id,
        producto: row.producto_nombre,
        cantidad: Number(row.cantidad),
        precio_unitario: Number(row.precio_unitario),
        subtotal: Number(row.subtotal),
        observaciones: row.observaciones
      });
    }

    res.json({
      ...sesion.rows[0],
      total: Number(sesion.rows[0].total),
      pedidos: Array.from(pedidos.values())
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los detalles de la cuenta' });
  }
};

export const cobrarCuenta = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { sesion_id } = req.params;
    
    const turno = await client.query("SELECT id FROM turnos_caja WHERE estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1 FOR UPDATE");
    if (turno.rows.length === 0) {
       await client.query('ROLLBACK');
       res.status(400).json({ message: 'No hay turno de caja abierto' });
       return;
    }
    const turno_id = turno.rows[0].id;

    const sesion = await client.query(`
      SELECT sm.id, sm.mesa_id, sm.estado, sm.total, sm.cliente_nombre, m.numero_mesa
      FROM sesiones_mesa sm
      LEFT JOIN mesas m ON m.id = sm.mesa_id
      WHERE sm.id = $1
      FOR UPDATE OF sm
    `, [sesion_id]);
    if (sesion.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ message: 'Cuenta no encontrada' });
      return;
    }
    if (!['abierta', 'pidiendo_cuenta'].includes(sesion.rows[0].estado)) {
      await client.query('ROLLBACK');
      res.status(409).json({ message: 'Esta cuenta ya fue cobrada o cerrada' });
      return;
    }

    const detalles = await client.query(`
      SELECT pr.nombre AS producto_nombre, c.nombre AS categoria_nombre, p.tipo_pedido,
             dp.cantidad, dp.precio_unitario, dp.subtotal, dp.observaciones
      FROM pedidos p
      JOIN detalles_pedido dp ON dp.pedido_id = p.id
      JOIN productos pr ON pr.id = dp.producto_id
      LEFT JOIN categorias c ON c.id = pr.categoria_id
      WHERE p.sesion_mesa_id = $1 AND p.estado <> 'cancelado'
      ORDER BY p.creado_en, dp.id
    `, [sesion_id]);

    await client.query("UPDATE sesiones_mesa SET estado = 'pagada', cerrada_en = NOW(), turno_caja_id = $1 WHERE id = $2", [turno_id, sesion_id]);
    if (sesion.rows[0].mesa_id !== null) {
      await client.query("UPDATE mesas SET estado = 'disponible' WHERE id = $1", [sesion.rows[0].mesa_id]);
    }
    await client.query("UPDATE pedidos SET estado = 'pagado' WHERE sesion_mesa_id = $1", [sesion_id]);

    // LÓGICA DE INVENTARIO: Descontar insumos
    const pedidos = await client.query("SELECT id FROM pedidos WHERE sesion_mesa_id = $1", [sesion_id]);
    for (const ped of pedidos.rows) {
      const detalles = await client.query("SELECT producto_id, cantidad FROM detalles_pedido WHERE pedido_id = $1", [ped.id]);
      for (const det of detalles.rows) {
        // Encontrar receta y descontar
        const receta = await client.query("SELECT insumo_id, cantidad_requerida FROM recetas WHERE producto_id = $1", [det.producto_id]);
        for (const rec of receta.rows) {
          const descontar = rec.cantidad_requerida * det.cantidad;
          await client.query("UPDATE insumos SET cantidad_disponible = cantidad_disponible - $1 WHERE id = $2", [descontar, rec.insumo_id]);
          await client.query("INSERT INTO movimientos_inventario (insumo_id, tipo, cantidad, motivo) VALUES ($1, 'salida', $2, 'Venta')", [rec.insumo_id, descontar]);
        }
      }
    }

    await client.query('COMMIT');
    getIO().emit('sesion_pagada', { sesion_id, mesa_id: sesion.rows[0].mesa_id });
    res.json({
      message: 'Cobro procesado correctamente',
      recibo: {
        sesion_id,
        numero_mesa: sesion.rows[0].numero_mesa,
        cliente_nombre: sesion.rows[0].cliente_nombre,
        total: Number(sesion.rows[0].total),
        detalles: detalles.rows.map(detalle => ({
          producto: detalle.producto_nombre,
          categoria: detalle.categoria_nombre,
          tipo_pedido: detalle.tipo_pedido,
          cantidad: Number(detalle.cantidad),
          precio_unitario: Number(detalle.precio_unitario),
          subtotal: Number(detalle.subtotal),
          observaciones: detalle.observaciones
        }))
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Error al procesar cobro' });
  } finally {
    client.release();
  }
};
