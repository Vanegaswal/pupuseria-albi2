import fs from 'fs';
import path from 'path';
import { pool } from '../src/config/database';

async function runSchema() {
  try {
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log("Ejecutando schema.sql en Supabase...");
    await pool.query(schema);
    console.log("¡Base de datos configurada con éxito!");
    
    // Insert initial roles and an admin user
    const seed = `
      INSERT INTO roles (nombre, descripcion) VALUES 
      ('Administrador', 'Control total del sistema'),
      ('Cocina', 'Acceso al monitor de cocina y actualización de estados'),
      ('Cajero', 'Gestión de pagos y comprobantes'),
      ('Mesero', 'Atención de mesas y toma manual de pedidos')
      ON CONFLICT (nombre) DO NOTHING;
    `;
    await pool.query(seed);
    console.log("Roles iniciales creados.");
    
    process.exit(0);
  } catch (error) {
    console.error("Error al ejecutar el script:", error);
    process.exit(1);
  }
}

runSchema();
