import { pool } from '../src/config/database';

async function update() {
  await pool.query(`
    ALTER TABLE sesiones_mesa ADD COLUMN IF NOT EXISTS cliente_nombre VARCHAR(100);
  `);
  console.log("DB Updated");
  process.exit(0);
}
update();
