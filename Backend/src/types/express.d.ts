// express.d.ts
import { UserModel } from '../db';  // Adjust the import path to your User type

declare global {
  namespace Express {
    interface Request {
      user?: UserModel;  // Add 'user' to the Request interface
    }
  }
}
