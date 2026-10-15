import { Router } from 'express';
import { cambiarDisponibilidadProducto, cambiarEstadoCategoria, crearCategoria, crearProducto, getCatalogoAdmin, getProductos, actualizarProducto } from '../controllers/productos.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /productos:
 *   get:
 *     summary: Listar productos del menú
 *     tags: [Productos]
 *     responses:
 *       200:
 *         description: Catálogo público de productos activos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get('/', getProductos); // Público para el cliente

/**
 * @swagger
 * /productos/admin/catalogo:
 *   get:
 *     summary: Consultar categorías y productos activos o retirados
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Catálogo de administración
 *       403:
 *         description: Se requiere rol Administrador
 */
router.get('/admin/catalogo', requireAuth, requireRole(['Administrador']), getCatalogoAdmin);

/**
 * @swagger
 * /productos/categorias:
 *   post:
 *     summary: Crear una categoría de menú
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre]
 *             properties:
 *               nombre:
 *                 type: string
 *     responses:
 *       201:
 *         description: Categoría creada
 *       409:
 *         description: Ya existe una categoría con ese nombre
 */
router.post('/categorias', requireAuth, requireRole(['Administrador']), crearCategoria);

/**
 * @swagger
 * /productos/categorias/{id}/estado:
 *   patch:
 *     summary: Mostrar u ocultar una categoría del menú
 *     tags: [Productos]
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
 *             required: [activa]
 *             properties:
 *               activa:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Estado de categoría actualizado
 */
router.patch('/categorias/:id/estado', requireAuth, requireRole(['Administrador']), cambiarEstadoCategoria);

/**
 * @swagger
 * /productos:
 *   post:
 *     summary: Agregar un producto al menú
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, categoria_id, precio]
 *             properties:
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               categoria_id:
 *                 type: integer
 *               precio:
 *                 type: number
 *                 exclusiveMinimum: 0
 *     responses:
 *       201:
 *         description: Producto agregado
 *       400:
 *         description: Datos inválidos o categoría inactiva
 */
router.post('/', requireAuth, requireRole(['Administrador']), crearProducto);

/**
 * @swagger
 * /productos/{id}:
 *   put:
 *     summary: Modificar un producto del menú
 *     tags: [Productos]
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
 *             required: [nombre, categoria_id, precio]
 *             properties:
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               categoria_id:
 *                 type: integer
 *               precio:
 *                 type: number
 *     responses:
 *       200:
 *         description: Producto actualizado
 *       404:
 *         description: Producto no encontrado
 */
router.put('/:id', requireAuth, requireRole(['Administrador']), actualizarProducto);

/**
 * @swagger
 * /productos/{id}/disponibilidad:
 *   patch:
 *     summary: Publicar o retirar un producto sin eliminar su historial
 *     tags: [Productos]
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
 *             required: [disponible]
 *             properties:
 *               disponible:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Disponibilidad actualizada
 */
router.patch('/:id/disponibilidad', requireAuth, requireRole(['Administrador']), cambiarDisponibilidadProducto);

export default router;
