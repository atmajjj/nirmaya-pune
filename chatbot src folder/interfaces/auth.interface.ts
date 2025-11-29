import { Request } from "express";
import { IUser } from "../features/user/user.interface";

export interface DataStoredInToken {
  id: number;
}

export interface TokenData {
  token: string;
  expiresIn: number;
}

export interface RequestWithUser extends Request {
  user?: IUser;
  userId?: number; // For cases where we only have the user ID from token
}
