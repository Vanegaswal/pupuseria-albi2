import express, { Request, Response } from 'express';
import cors from 'cors';
import { setupSwagger } from './config/swagger';
import authRoutes from './routes/auth.routes';
import mesasRoutes from './routes/mesas.routes';
import productosRoutes from './routes/productos.routes';
import pedidosRoutes from './routes/pedidos.routes';
import cajaRoutes from './routes/caja.routes';
import inventarioRoutes from './routes/inventario.routes';
import estadisticasRoutes from './routes/estadisticas.routes';

const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req: Request, res: Response) => {
  res.send('API de Pupusería Albi funcionando');
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/mesas', mesasRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/caja', cajaRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
setupSwagger(app);

export default app;
