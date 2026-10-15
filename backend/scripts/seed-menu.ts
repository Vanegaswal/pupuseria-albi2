import { pool } from '../src/config/database';

async function seedMenu() {
  try {
    const catPupusas = await pool.query("INSERT INTO categorias (nombre) VALUES ('Pupusas') ON CONFLICT (nombre) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING id");
    const catBebidas = await pool.query("INSERT INTO categorias (nombre) VALUES ('Bebidas') ON CONFLICT (nombre) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING id");

    const idPupusas = catPupusas.rows[0].id;
    const idBebidas = catBebidas.rows[0].id;

    await pool.query(`
      INSERT INTO productos (categoria_id, nombre, descripcion, precio) VALUES 
      ($1, 'Pupusa Revuelta', 'Frijol, queso y chicharrón', 0.60),
      ($1, 'Pupusa de Queso', 'Queso 100% puro', 0.60),
      ($1, 'Pupusa de Frijol con Queso', 'Deliciosa mezcla tradicional', 0.60),
      ($2, 'Horchata', 'Bebida fría y refrescante', 1.00),
      ($2, 'Gaseosa', 'Variedad de sabores', 0.75)
    `, [idPupusas, idBebidas]);

    console.log("Menú base creado.");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
seedMenu();
