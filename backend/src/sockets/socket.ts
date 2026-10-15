import { Server, Socket } from 'socket.io';

let io: Server;

export const initSocket = (server: any) => {
  io = new Server(server, {
    cors: {
      origin: "*", // En producción configurar correctamente
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    // La cocina se puede unir a un "room" especial para recibir notificaciones
    socket.on('join_cocina', () => {
      socket.join('cocina');
      console.log(`Socket ${socket.id} unido a la sala 'cocina'`);
    });

    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io no ha sido inicializado');
  }
  return io;
};
