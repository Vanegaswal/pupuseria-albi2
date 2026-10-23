import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedUser } from '../dtos/auth.dto';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123';

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'No autorizado, token faltante' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (
      typeof decoded === 'string' ||
      typeof decoded.id !== 'string' ||
      typeof decoded.usuario !== 'string' ||
      typeof decoded.rol !== 'string'
    ) {
      res.status(401).json({ message: 'Token inválido o expirado' });
      return;
    }

    req.user = {
      id: decoded.id,
      usuario: decoded.usuario,
      rol: decoded.rol
    } satisfies AuthenticatedUser;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user || !roles.includes(user.rol)) {
      res.status(403).json({ message: 'No tienes permisos para acceder a este recurso' });
      return;
    }
    next();
  };
};
