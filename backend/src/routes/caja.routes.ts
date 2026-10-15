import { Router } from 'express';
import { getCuentasAbiertas, getDetalleCuenta, cobrarCuenta, estadoTurno, abrirTurno, cerrarTurno, getHistorialTurnos } from '../controllers/caja.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /caja/turno:
 *   get:
 *     summary: Consultar el turno de caja abierto y su monto esperado
 *     tags: [Caja]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estado de caja y total del turno, o activo false
 *       401:
 *         description: Token inválido o ausente
 */
router.get('/turno', requireAuth, estadoTurno);

/**
 * @swagger
 * /caja/turnos/historial:
 *   get:
 *     summary: Consultar el historial completo de turnos de caja
 *     tags: [Caja]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Apertura, cierre, monto inicial, ventas brutas y monto final de cada turno
 */
router.get('/turnos/historial', requireAuth, requireRole(['Administrador', 'Cajero']), getHistorialTurnos);

/**
 * @swagger
 * /caja/turno/abrir:
 *   post:
 *     summary: Abrir un turno de caja
 *     tags: [Caja]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [monto_apertura]
 *             properties:
 *               monto_apertura:
 *                 type: number
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Turno abierto exitosamente
 *       400:
 *         description: Ya existe un turno abierto
 *       403:
 *         description: Se requiere rol Administrador o Cajero
 */
router.post('/turno/abrir', requireAuth, requireRole(['Administrador', 'Cajero']), abrirTurno);

/**
 * @swagger
 * /caja/turno/cerrar:
 *   post:
 *     summary: Cerrar el turno abierto calculando el monto en el servidor
 *     description: No acepta montos ni identificadores del cliente. Guarda como cierre el monto de apertura más las ventas asociadas al turno.
 *     tags: [Caja]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Turno cerrado con el monto calculado
 *       400:
 *         description: No hay turno de caja abierto
 *       403:
 *         description: Se requiere rol Administrador o Cajero
 */
router.post('/turno/cerrar', requireAuth, requireRole(['Administrador', 'Cajero']), cerrarTurno);

/**
 * @swagger
 * /caja/cuentas:
 *   get:
 *     summary: Listar cuentas pendientes de cobro
 *     tags: [Caja]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sesiones abiertas y mesas correspondientes
 */
router.get('/cuentas', requireAuth, getCuentasAbiertas);
router.get('/cuentas/:sesion_id/detalles', requireAuth, requireRole(['Administrador', 'Cajero', 'Mesero']), getDetalleCuenta);

/**
 * @swagger
 * /caja/cobrar/{sesion_id}:
 *   post:
 *     summary: Cobrar una cuenta y cerrar su sesión de mesa
 *     tags: [Caja]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sesion_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cobro procesado correctamente con comprobante detallado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 recibo:
 *                   type: object
 *                   properties:
 *                     numero_mesa:
 *                       type: integer
 *                     cliente_nombre:
 *                       type: string
 *                       nullable: true
 *                     total:
 *                       type: number
 *                     detalles:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           producto:
 *                             type: string
 *                           categoria:
 *                             type: string
 *                             nullable: true
 *                           cantidad:
 *                             type: integer
 *                           precio_unitario:
 *                             type: number
 *                           subtotal:
 *                             type: number
 *                           observaciones:
 *                             type: string
 *       400:
 *         description: No hay turno de caja abierto
 *       404:
 *         description: Cuenta no encontrada
 *       409:
 *         description: La cuenta ya fue cobrada o cerrada
 *       403:
 *         description: Se requiere rol Administrador, Cajero o Mesero
 */
router.post('/cobrar/:sesion_id', requireAuth, requireRole(['Administrador', 'Cajero', 'Mesero']), cobrarCuenta);

export default router;
