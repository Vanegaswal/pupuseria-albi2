import type { AuthenticatedUser } from '../dtos/auth.dto';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
