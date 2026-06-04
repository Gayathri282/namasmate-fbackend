import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export function authenticateAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];
  const jwtSecret = process.env.JWT_SECRET || "namas_mate_extremely_secure_jwt_token_secret_2026";

  try {
    const decoded = jwt.verify(token, jwtSecret) as { id: string; email: string };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid session token." });
  }
}
