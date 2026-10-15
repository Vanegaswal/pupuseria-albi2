import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Pupusería Albi',
      version: '1.0.0',
      description: 'API del sistema de Pupusería Albi. Las rutas protegidas requieren un token JWT Bearer.',
    },
    tags: [
      { name: 'Auth', description: 'Autenticación y perfil de usuario' },
      { name: 'Mesas', description: 'Mesas y solicitudes de cuenta' },
      { name: 'Productos', description: 'Catálogo público de productos' },
      { name: 'Pedidos', description: 'Pedidos y estados de cocina' },
      { name: 'Caja', description: 'Turnos y cobros' },
      { name: 'Inventario', description: 'Insumos y ajustes de existencias' },
      { name: 'Estadísticas', description: 'Resumen de ventas' },
    ],
    servers: [
      {
        url: 'http://localhost:3000/api',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
