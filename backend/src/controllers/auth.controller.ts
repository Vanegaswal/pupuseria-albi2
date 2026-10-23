import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';
import {
  AuthUserRecord,
  LoginRequestDto,
  ProfileRecord,
  toLoginResponseDto,
  toProfileResponseDto
} from '../dtos/auth.dto';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const credentials = LoginRequestDto.from(req.body);
    if (!credentials) {
      res.status(400).json({ message: 'Los datos de acceso no son válidos' });
      return;
    }

    const result = await pool.query<AuthUserRecord>(`
      SELECT u.id, u.usuario, u.password_hash, u.nombres, u.apellidos, r.nombre as rol
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE u.usuario = $1 AND u.activo = true
    `, [credentials.usuario]);

    if (result.rows.length === 0) {
      res.status(401).json({ message: 'Credenciales inválidas o usuario inactivo' });
      return;
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(credentials.password, user.password_hash);

    if (!isMatch) {
      res.status(401).json({ message: 'Credenciales inválidas' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, usuario: user.usuario, rol: user.rol },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json(toLoginResponseDto(user, token));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'No autorizado, token faltante' });
      return;
    }

    const result = await pool.query<ProfileRecord>(`
      SELECT u.id, u.usuario, u.nombres, u.apellidos, r.nombre as rol
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE u.id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    res.json(toProfileResponseDto(result.rows[0]));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};
