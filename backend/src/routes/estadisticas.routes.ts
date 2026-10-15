import { Router } from 'express';
import { getEstadisticas } from '../controllers/estadisticas.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /estadisticas:
 *   get:
 *     summary: Consultar estadísticas de ventas
 *     tags: [Estadísticas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: periodo
 *         schema:
 *           type: string
 *           enum: [dia, semana, mes]
 *           default: mes
 *         description: Periodo que se desea consultar
 *     responses:
 *       200:
 *         description: Productos más vendidos e ingresos totales
 */
router.get('/', requireAuth, requireRole(['Administrador']), getEstadisticas);
export default router;
