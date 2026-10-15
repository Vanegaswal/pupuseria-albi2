import { Request, Response } from 'express';
import { pool } from '../config/database';

export const getEstadisticas = async (req: Request, res: Response) => {
  try {
    const { periodo } = req.query; // 'dia', 'semana', 'mes'
    
    let interval = '1 month';
    if (periodo === 'dia') interval = '1 day';
    if (periodo === 'semana') interval = '1 week';
    
    // Productos más vendidos
    const productosResult = await pool.query(`
      SELECT p.nombre, SUM(dp.cantidad) as total_vendido
      FROM detalles_pedido dp
      JOIN pedidos ped ON dp.pedido_id = ped.id
      JOIN productos p ON dp.producto_id = p.id
      WHERE ped.estado = 'pagado' AND ped.creado_en >= NOW() - INTERVAL '${interval}'
      GROUP BY p.nombre
      ORDER BY total_vendido DESC
      LIMIT 10
    `);
    
    // Ingresos totales
    const ingresosResult = await pool.query(`
      SELECT SUM(total) as ingresos
      FROM sesiones_mesa
      WHERE estado = 'pagada' AND cerrada_en >= NOW() - INTERVAL '${interval}'
    `);

    res.json({
      productos_mas_vendidos: productosResult.rows.map(r => ({ nombre: r.nombre, cantidad: parseInt(r.total_vendido) })),
      ingresos_totales: parseFloat(ingresosResult.rows[0].ingresos) || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
};
