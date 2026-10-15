import bcrypt from 'bcryptjs';
import { pool } from '../src/config/database';

async function seedAdmin() {
  try {
    const initialPassword = process.env.INITIAL_ADMIN_PASSWORD;
    if (!initialPassword || initialPassword.length < 12) {
      throw new Error('Configura INITIAL_ADMIN_PASSWORD con al menos 12 caracteres antes de crear el administrador');
    }
    const passwordHash = await bcrypt.hash(initialPassword, 10);
    
    // Obtener el ID del rol Administrador
    const rolResult = await pool.query("SELECT id FROM roles WHERE nombre = 'Administrador'");
    if (rolResult.rows.length === 0) throw new Error("Rol Administrador no encontrado");
    
    const adminRolId = rolResult.rows[0].id;

    // Insertar usuario
    await pool.query(`
      INSERT INTO usuarios (nombres, apellidos, usuario, password_hash, rol_id)
      VALUES ('Admin', 'Sistema', 'admin', $1, $2)
      ON CONFLICT (usuario) DO NOTHING
    `, [passwordHash, adminRolId]);

    console.log("Usuario administrador creado (Usuario: admin)");
    process.exit(0);
  } catch (error) {
    console.error("Error creando admin:", error);
    process.exit(1);
  }
}

seedAdmin();
