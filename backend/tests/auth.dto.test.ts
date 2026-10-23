import {
  LoginRequestDto,
  ProfileRecord,
  toLoginResponseDto,
  toProfileResponseDto
} from '../src/dtos/auth.dto';

describe('Auth DTOs', () => {
  describe('LoginRequestDto', () => {
    it('accepts valid credentials and trims the username', () => {
      expect(LoginRequestDto.from({ usuario: '  albi  ', password: 'secret' })).toEqual(
        new LoginRequestDto('albi', 'secret')
      );
    });

    it.each([
      null,
      undefined,
      {},
      { usuario: 'albi' },
      { usuario: 1, password: 'secret' },
      { usuario: '   ', password: 'secret' },
      { usuario: 'a'.repeat(51), password: 'secret' },
      { usuario: 'albi', password: '' }
    ])('rejects invalid credentials: %p', (body) => {
      expect(LoginRequestDto.from(body)).toBeNull();
    });
  });

  it('maps user records to the login response without exposing the password hash', () => {
    const record = {
      id: 'user-id',
      usuario: 'albi',
      password_hash: 'hash',
      nombres: 'Ana',
      apellidos: 'Albi',
      rol: 'Administrador'
    };

    expect(toLoginResponseDto(record, 'jwt-token')).toEqual({
      token: 'jwt-token',
      usuario: {
        id: 'user-id',
        nombre: 'Ana Albi',
        rol: 'Administrador'
      }
    });
  });

  it('maps profile records to the public profile response', () => {
    const record: ProfileRecord = {
      id: 'user-id',
      usuario: 'albi',
      nombres: 'Ana',
      apellidos: 'Albi',
      rol: 'Administrador'
    };

    expect(toProfileResponseDto(record)).toEqual(record);
  });
});
