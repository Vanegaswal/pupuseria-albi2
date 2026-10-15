import request from 'supertest';
import app from '../src/app';
import { pool } from '../src/config/database';

describe('API Productos', () => {
  afterAll(async () => {
    // Cerrar la conexión a la base de datos después de las pruebas
    await pool.end();
  });

  it('Debería obtener la lista de productos (GET /api/productos)', async () => {
    const res = await request(app).get('/api/productos');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    
    // Verificar que un producto del mockup (ej. Pupusa) esté presente
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('nombre');
      expect(res.body[0]).toHaveProperty('precio');
      expect(res.body[0]).toHaveProperty('categoria_nombre');
    }
  });

  it('Debería retornar 404 para una ruta inexistente', async () => {
    const res = await request(app).get('/api/ruta-falsa');
    expect(res.statusCode).toEqual(404);
  });
});
