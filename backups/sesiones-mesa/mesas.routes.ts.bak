import { Router } from 'express';
import { getMesas, getMesasPublicas, getSesionPublica, createMesa, solicitarCuenta } from '../controllers/mesas.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /mesas/publicas:
 *   get:
 *     summary: Listar mesas para seleccionar en el menú público
 *     tags: [Mesas]
 *     responses:
 *       200:
 *         description: Identificadores y números de mesa disponibles para el menú
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   numero_mesa:
 *                     type: integer
 */
router.get('/publicas', getMesasPublicas);
router.get('/:id/sesion-publica', getSesionPublica);

/**
 * @swagger
 * /mesas:
 *   get:
 *     summary: Listar mesas
 *     tags: [Mesas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Listado de mesas y estado actual
 *       401:
 *         description: Token inválido o ausente
 */
router.get('/', requireAuth, getMesas);

/**
 * @swagger
 * /mesas:
 *   post:
 *     summary: Crear una mesa
 *     tags: [Mesas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [numero_mesa]
 *             properties:
 *               numero_mesa:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       201:
 *         description: Mesa creada
 *       401:
 *         description: Token inválido o ausente
 *       403:
 *         description: Se requiere rol Administrador
 */
router.post('/', requireAuth, requireRole(['Administrador']), createMesa);

/**
 * @swagger
 * /mesas/{id}/solicitar-cuenta:
 *   post:
 *     summary: Solicitar la cuenta de una mesa desde el menú cliente
 *     tags: [Mesas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cuenta solicitada
 *       500:
 *         description: No se pudo solicitar la cuenta
 */
router.post('/:id/solicitar-cuenta', solicitarCuenta);

export default router;
