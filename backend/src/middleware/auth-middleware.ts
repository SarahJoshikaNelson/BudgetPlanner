import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export interface AuthRequest extends Request {
    user?: { userId: number; email: string; role: string };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        res.status(401).json({ error: "No Token" });
        return;
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET) as { userId: number; email: string; role: string };
        req.user = payload;
        next();
    } catch {
        res.status(401).json({ error: "Token unauthorized or expired" });
    }
}

export const requireRole =
    (role: string): RequestHandler =>
    (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (req.user?.role === role) {
            next();
            return;
        }
        res.status(403).json({ error: `Role '${role}' required.` });
    };