import app from "./app";
import { pool } from "./config/database";
import http from 'http';
import { initSocket } from './sockets/socket';

const PORT = Number(process.env.PORT) || 3000;

async function iniciarServidor() {
  try {
    await pool.query("SELECT NOW()");
    console.log("Base de datos conectada correctamente");

    const server = http.createServer(app);
    initSocket(server);

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor HTTP y WebSockets ejecutándose en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error("Error al conectar con la base de datos:", error);
  }
}

iniciarServidor();
