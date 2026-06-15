import express, { Response } from 'express';
import { AuthService } from '../service/auth-service';
import { authMiddleware, AuthRequest } from '../middleware/auth-middleware';

export const authRouter = express.Router();
const service = new AuthService();

authRouter.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const result = await service.register(username, email, password);
    if (!result) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    res.json({ message: 'Registered' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await service.login(email, password);
    if (!user) {
      res.status(401).json({ error: 'Email or Password wrong' });
      return;
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

authRouter.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'No Refresh Token' });
    const result = await service.refresh(refreshToken);
    if (!result) return res.status(401).json({ error: 'Unauthorized Refresh Token' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

authRouter.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await service.logout(refreshToken);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

authRouter.patch('/profile-color', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { color } = req.body;
    if (!color) {
      res.status(400).json({ error: 'No color provided' });
      return;
    }
    await service.updateProfileColor(req.user!.userId, color);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});