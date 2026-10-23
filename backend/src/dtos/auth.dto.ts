export class LoginRequestDto {
  constructor(
    public readonly usuario: string,
    public readonly password: string
  ) {}

  static from(value: unknown): LoginRequestDto | null {
    if (typeof value !== 'object' || value === null) {
      return null;
    }

    const body = value as Record<string, unknown>;
    if (typeof body.usuario !== 'string' || typeof body.password !== 'string') {
      return null;
    }

    const usuario = body.usuario.trim();
    if (usuario.length === 0 || usuario.length > 50 || body.password.length === 0) {
      return null;
    }

    return new LoginRequestDto(usuario, body.password);
  }
}

export interface AuthenticatedUser {
  id: string;
  usuario: string;
  rol: string;
}

export interface LoginUserDto {
  id: string;
  nombre: string;
  rol: string;
}

export interface LoginResponseDto {
  token: string;
  usuario: LoginUserDto;
}

export interface ProfileResponseDto {
  id: string;
  usuario: string;
  nombres: string;
  apellidos: string;
  rol: string;
}

export interface AuthUserRecord {
  id: string;
  usuario: string;
  password_hash: string;
  nombres: string;
  apellidos: string;
  rol: string;
}

export interface ProfileRecord extends Omit<AuthUserRecord, 'password_hash'> {}

export const toLoginResponseDto = (
  user: AuthUserRecord,
  token: string
): LoginResponseDto => ({
  token,
  usuario: {
    id: user.id,
    nombre: `${user.nombres} ${user.apellidos}`,
    rol: user.rol
  }
});

export const toProfileResponseDto = (user: ProfileRecord): ProfileResponseDto => ({
  id: user.id,
  usuario: user.usuario,
  nombres: user.nombres,
  apellidos: user.apellidos,
  rol: user.rol
});
