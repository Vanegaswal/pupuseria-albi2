import { Router } from 'express';
import { getPedidos, crearPedido, actualizarEstadoPedido } from '../controllers/pedidos.controller';

const router = Router();

/**
 * @swagger
 * /pedidos:
 *   get:
 *     summary: Listar pedidos pendientes para cocina
 *     tags: [Pedidos]
 *     responses:
 *       200:
 *         description: Pedidos sin pagar ni cancelar con sus detalles
 */
router.get('/', getPedidos);

/**
 * @swagger
 * /pedidos:
 *   post:
 *     summary: Crear un pedido desde el menú cliente
 *     tags: [Pedidos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mesa_id, detalles]
 *             properties:
 *               mesa_id:
 *                 type: integer
 *               origen:
 *                 type: string
 *                 example: qr
 *               cliente_nombre:
 *                 type: string
 *               detalles:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [producto_id, cantidad]
 *                   properties:
 *                     producto_id:
 *                       type: integer
 *                     cantidad:
 *                       type: integer
 *                     precio_unitario:
 *                       type: number
 *                       description: El servidor ignora el precio enviado y usa el precio vigente del catálogo.
 *                     observaciones:
 *                       type: string
 *     responses:
 *       201:
 *         description: Pedido creado exitosamente
 *       500:
 *         description: No se pudo crear el pedido
 */
router.post('/', crearPedido);

/**
 * @swagger
 * /pedidos/{id}/estado:
 *   put:
 *     summary: Actualizar el estado de un pedido
 *     tags: [Pedidos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estado]
 *             properties:
 *               estado:
 *                 type: string
 *                 example: listo
 *     responses:
 *       200:
 *         description: Estado actualizado correctamente
 *       500:
 *         description: No se pudo actualizar el estado
 */
router.put('/:id/estado', actualizarEstadoPedido);

export default router;
