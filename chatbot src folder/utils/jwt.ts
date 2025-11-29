import jwt from "jsonwebtoken";
import HttpException from "../exceptions/HttpException";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("JWT_SECRET environment variable is not set!");
}

export const generateToken = (payload: object, expiresIn = "1d") => {
  try {
    if (!JWT_SECRET) {
      throw new HttpException(500, "JWT secret is not configured");
    }
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
  } catch (error) {
    throw new HttpException(500, `Error generating token: ${error.message}`);
  }
};

export const verifyToken = (token: string) => {
  try {
    if (!JWT_SECRET) {
      throw new HttpException(500, "JWT secret is not configured");
    }
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new HttpException(401, "Token has expired");
    }
    if (error.name === "JsonWebTokenError") {
      throw new HttpException(401, "Invalid token");
    }
    throw new HttpException(500, `Token verification error: ${error.message}`);
  }
};
