import { Request, Response } from 'express';
import { pool } from '../config/database';
import { getIO } from '../sockets/socket';

export const getPedidos = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT p.*, sm.mesa_id, sm.cliente_nombre, m.numero_mesa
      FROM pedidos p
      JOIN sesiones_mesa sm ON p.sesion_mesa_id = sm.id
      JOIN mesas m ON sm.mesa_id = m.id
      WHERE p.estado NOT IN ('pagado', 'cancelado')
      ORDER BY p.creado_en DESC
    `);
    
    // Obtener los detalles de cada pedido
    const pedidos = result.rows;
    for (let pedido of pedidos) {
      const detalles = await pool.query(`
        SELECT dp.*, prod.nombre as producto_nombre
        FROM detalles_pedido dp
        JOIN productos prod ON dp.producto_id = prod.id
        WHERE dp.pedido_id = $1
      `, [pedido.id]);
      pedido.detalles = detalles.rows;
    }
    
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener pedidos' });
  }
};

export const crearPedido = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { mesa_id, origen, detalles, cliente_nombre } = req.body;
    const tipoPedido = req.body.tipo_pedido ?? 'mesa';
    const mesaId = Number(mesa_id);
    if (!Number.isInteger(mesaId) || mesaId <= 0 || !Array.isArray(detalles) || detalles.length === 0 || !['mesa', 'llevar'].includes(tipoPedido)) {
      await client.query('ROLLBACK');
      res.status(400).json({ message: 'Mesa y al menos un producto son obligatorios' });
      return;
    }

    const mesa = await client.query('SELECT id, numero_mesa FROM mesas WHERE id = $1 FOR UPDATE', [mesaId]);
    if (mesa.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ message: 'Mesa no encontrada' });
      return;
    }

    // 1. Obtener o crear sesión activa de la mesa
    const sesionActiva = await client.query(
      "SELECT id, estado, cliente_nombre FROM sesiones_mesa WHERE mesa_id = $1 AND estado IN ('abierta', 'pidiendo_cuenta') LIMIT 1",
      [mesaId]
    );
    let sesion_id;
    
    if (sesionActiva.rows.length === 0) {
      const nuevaSesion = await client.query(
        'INSERT INTO sesiones_mesa (mesa_id, cliente_nombre) VALUES ($1, $2) RETURNING id', [mesaId, cliente_nombre || null]
      );
      sesion_id = nuevaSesion.rows[0].id;
      await client.query('UPDATE mesas SET estado = $1 WHERE id = $2', ['ocupada', mesaId]);
    } else {
      sesion_id = sesionActiva.rows[0].id;
      if (!sesionActiva.rows[0].cliente_nombre && typeof cliente_nombre === 'string' && cliente_nombre.trim()) {
        await client.query('UPDATE sesiones_mesa SET cliente_nombre = $1 WHERE id = $2', [cliente_nombre.trim(), sesion_id]);
      }
    }

    // 2. Crear pedido
    let totalPedido = 0;
    const pedidoInsert = await client.query(
      'INSERT INTO pedidos (sesion_mesa_id, origen, tipo_pedido, estado) VALUES ($1, $2, $3, $4) RETURNING id, creado_en',
      [sesion_id, origen || 'qr', tipoPedido, 'pendiente']
    );
    const pedidoId = pedidoInsert.rows[0].id;

    // 3. Insertar detalles
    const detallesProcesados = [];
    for (const item of detalles) {
      const productoId = Number(item.producto_id);
      const cantidad = Number(item.cantidad);
      if (!Number.isInteger(productoId) || productoId <= 0 || !Number.isInteger(cantidad) || cantidad <= 0) {
        await client.query('ROLLBACK');
        res.status(400).json({ message: 'Hay un producto o cantidad inválidos en el pedido' });
        return;
      }

      const producto = await client.query(`
        SELECT p.id, p.nombre, p.precio
        FROM productos p
        JOIN categorias c ON c.id = p.categoria_id AND c.activa = true
        WHERE p.id = $1 AND p.disponible = true
        FOR SHARE OF p
      `, [productoId]);
      if (producto.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(409).json({ message: 'Uno de los productos ya no está disponible en el menú' });
        return;
      }

      const precioUnitario = Number(producto.rows[0].precio);
      const subtotal = cantidad * precioUnitario;
      totalPedido += subtotal;
      await client.query(
        'INSERT INTO detalles_pedido (pedido_id, producto_id, cantidad, precio_unitario, subtotal, observaciones) VALUES ($1, $2, $3, $4, $5, $6)',
        [pedidoId, productoId, cantidad, precioUnitario, subtotal, item.observaciones || '']
      );
      detallesProcesados.push({ ...item, producto_id: productoId, producto_nombre: producto.rows[0].nombre, cantidad, precio_unitario: precioUnitario, subtotal });
    }

    // 4. Actualizar total pedido
    await client.query('UPDATE pedidos SET total = $1 WHERE id = $2', [totalPedido, pedidoId]);
    await client.query('UPDATE sesiones_mesa SET total = total + $1 WHERE id = $2', [totalPedido, sesion_id]);

    await client.query('COMMIT');

    // Mapear info para enviar a la cocina vía WebSockets
    const nuevoPedidoEvent = {
      id: pedidoId,
      mesa_id: mesaId,
      numero_mesa: mesa.rows[0].numero_mesa,
      cliente_nombre: sesionActiva.rows[0]?.cliente_nombre || (typeof cliente_nombre === 'string' ? cliente_nombre.trim() : null),
      tipo_pedido: tipoPedido,
      estado: 'pendiente',
      total: totalPedido,
      origen,
      detalles: detallesProcesados,
      creado_en: pedidoInsert.rows[0].creado_en
    };

    // Emitir evento a monitor de cocina
    getIO().to('cocina').emit('nuevo_pedido', nuevoPedidoEvent);

    res.status(201).json({ message: 'Pedido creado exitosamente', id: pedidoId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Error al crear pedido' });
  } finally {
    client.release();
  }
};

export const actualizarEstadoPedido = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    await pool.query('UPDATE pedidos SET estado = $1, actualizado_en = NOW() WHERE id = $2', [estado, id]);
    
    // Notificar a todos los clientes del cambio de estado (ej. para que la mesa lo vea o los meseros)
    getIO().emit('estado_pedido_actualizado', { id, estado });
    
    res.json({ message: 'Estado actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar estado' });
  }
};
