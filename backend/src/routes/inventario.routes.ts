import { Router } from 'express';
import { getInsumos, createInsumo, ajustarInsumo } from '../controllers/inventario.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /inventario:
 *   get:
 *     summary: Listar insumos
 *     tags: [Inventario]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Existencias y niveles mínimos
 */
router.get('/', requireAuth, requireRole(['Administrador']), getInsumos);

/**
 * @swagger
 * /inventario:
 *   post:
 *     summary: Crear un insumo
 *     tags: [Inventario]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, unidad_medida]
 *             properties:
 *               nombre:
 *                 type: string
 *               unidad_medida:
 *                 type: string
 *               cantidad_disponible:
 *                 type: number
 *               nivel_minimo:
 *                 type: number
 *     responses:
 *       201:
 *         description: Insumo creado
 */
router.post('/', requireAuth, requireRole(['Administrador']), createInsumo);

/**
 * @swagger
 * /inventario/{id}/ajustar:
 *   post:
 *     summary: Ajustar existencias de un insumo
 *     tags: [Inventario]
 *     security:
 *       - bearerAuth: []
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
 *             required: [cantidad]
 *             properties:
 *               cantidad:
 *                 type: number
 *                 exclusiveMinimum: 0
 *                 description: Cantidad positiva que se suma o descuenta según tipo.
 *               tipo:
 *                 type: string
 *                 enum: [agregar, descontar]
 *                 description: Operación explícita solicitada desde el modal de inventario.
 *               motivo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Inventario actualizado
 */
router.post('/:id/ajustar', requireAuth, requireRole(['Administrador']), ajustarInsumo);

export default router;
