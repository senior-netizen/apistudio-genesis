import 'express';
import { RequestUser } from '../interfaces';

declare module 'express' {
  interface Request {
    user?: RequestUser;
  }
}
