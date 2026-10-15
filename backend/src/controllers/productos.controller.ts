import { Request, Response } from 'express';
import { pool } from '../config/database';
import { getIO } from '../sockets/socket';

const notificarCatalogoActualizado = () => {
  try {
    getIO().emit('catalogo_actualizado');
  } catch (error) {
    console.error('No se pudo notificar la actualización del menú:', error);
  }
};

export const getProductos = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.nombre as categoria_nombre 
      FROM productos p 
      LEFT JOIN categorias c ON p.categoria_id = c.id 
      WHERE p.disponible = true AND COALESCE(c.activa, true) = true
      ORDER BY c.nombre, p.nombre
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener productos' });
  }
};

export const getCatalogoAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const [categorias, productos] = await Promise.all([
      pool.query('SELECT id, nombre, activa FROM categorias ORDER BY nombre'),
      pool.query(`
        SELECT p.*, c.nombre AS categoria_nombre, c.activa AS categoria_activa
        FROM productos p
        LEFT JOIN categorias c ON c.id = p.categoria_id
        ORDER BY c.nombre NULLS LAST, p.nombre
      `)
    ]);
    res.json({ categorias: categorias.rows, productos: productos.rows });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el catálogo' });
  }
};

export const crearCategoria = async (req: Request, res: Response): Promise<void> => {
  try {
    const nombre = typeof req.body.nombre === 'string' ? req.body.nombre.trim() : '';
    if (!nombre) {
      res.status(400).json({ message: 'El nombre de la categoría es obligatorio' });
      return;
    }
    const result = await pool.query(
      'INSERT INTO categorias (nombre) VALUES ($1) RETURNING id, nombre, activa',
      [nombre]
    );
    notificarCatalogoActualizado();
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      res.status(409).json({ message: 'Ya existe una categoría con ese nombre' });
      return;
    }
    res.status(500).json({ message: 'Error al crear la categoría' });
  }
};

export const cambiarEstadoCategoria = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoriaId = Number(req.params.id);
    const { activa } = req.body;
    if (!Number.isInteger(categoriaId) || categoriaId <= 0 || typeof activa !== 'boolean') {
      res.status(400).json({ message: 'Categoría o estado inválidos' });
      return;
    }
    const result = await pool.query(
      'UPDATE categorias SET activa = $1 WHERE id = $2 RETURNING id, nombre, activa',
      [activa, categoriaId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Categoría no encontrada' });
      return;
    }
    notificarCatalogoActualizado();
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar la categoría' });
  }
};

export const crearProducto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, descripcion } = req.body;
    const categoriaId = Number(req.body.categoria_id);
    const precio = Number(req.body.precio);
    if (typeof nombre !== 'string' || !nombre.trim() || !Number.isInteger(categoriaId) || categoriaId <= 0 || !Number.isFinite(precio) || precio <= 0) {
      res.status(400).json({ message: 'Nombre, categoría y precio válido son obligatorios' });
      return;
    }
    const categoria = await pool.query('SELECT id FROM categorias WHERE id = $1 AND activa = true', [categoriaId]);
    if (categoria.rows.length === 0) {
      res.status(400).json({ message: 'Selecciona una categoría activa' });
      return;
    }
    const result = await pool.query(
      `INSERT INTO productos (categoria_id, nombre, descripcion, precio, disponible)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, categoria_id, nombre, descripcion, precio, disponible`,
      [categoriaId, nombre.trim(), typeof descripcion === 'string' ? descripcion.trim() : '', precio]
    );
    notificarCatalogoActualizado();
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el producto' });
  }
};

export const actualizarProducto = async (req: Request, res: Response): Promise<void> => {
  try {
    const productoId = Number(req.params.id);
    const { nombre, descripcion } = req.body;
    const categoriaId = Number(req.body.categoria_id);
    const precio = Number(req.body.precio);
    if (!Number.isInteger(productoId) || productoId <= 0 || typeof nombre !== 'string' || !nombre.trim() || !Number.isInteger(categoriaId) || categoriaId <= 0 || !Number.isFinite(precio) || precio <= 0) {
      res.status(400).json({ message: 'Datos de producto inválidos' });
      return;
    }
    const categoria = await pool.query('SELECT id FROM categorias WHERE id = $1 AND activa = true', [categoriaId]);
    if (categoria.rows.length === 0) {
      res.status(400).json({ message: 'Selecciona una categoría activa' });
      return;
    }
    const result = await pool.query(
      `UPDATE productos
       SET categoria_id = $1, nombre = $2, descripcion = $3, precio = $4
       WHERE id = $5
       RETURNING id, categoria_id, nombre, descripcion, precio, disponible`,
      [categoriaId, nombre.trim(), typeof descripcion === 'string' ? descripcion.trim() : '', precio, productoId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Producto no encontrado' });
      return;
    }
    notificarCatalogoActualizado();
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el producto' });
  }
};

export const cambiarDisponibilidadProducto = async (req: Request, res: Response): Promise<void> => {
  try {
    const productoId = Number(req.params.id);
    const { disponible } = req.body;
    if (!Number.isInteger(productoId) || productoId <= 0 || typeof disponible !== 'boolean') {
      res.status(400).json({ message: 'Producto o disponibilidad inválidos' });
      return;
    }
    const result = await pool.query(
      'UPDATE productos SET disponible = $1 WHERE id = $2 RETURNING id, nombre, disponible',
      [disponible, productoId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Producto no encontrado' });
      return;
    }
    notificarCatalogoActualizado();
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al cambiar la disponibilidad del producto' });
  }
};
