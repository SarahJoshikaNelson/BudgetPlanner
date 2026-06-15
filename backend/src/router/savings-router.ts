import express from 'express';
import { SavingsService } from '../service/savings-service';
import { authMiddleware, AuthRequest } from '../middleware/auth-middleware';
import { requireWrite } from '../middleware/workspace-context-middleware';

export const savingsRouter = express.Router();
const service = new SavingsService();
savingsRouter.use(authMiddleware);

savingsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.effectiveUserId ?? req.user!.userId;
    res.json(await service.getAll(userId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

savingsRouter.post('/', requireWrite('savings'), async (req: AuthRequest, res) => {
  try {
    const userId = req.effectiveUserId ?? req.user!.userId;
    const id = await service.create(userId, req.body);
    res.json({ message: 'Created', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

savingsRouter.put('/:id', requireWrite('savings'), async (req: AuthRequest, res) => {
  try {
    const userId = req.effectiveUserId ?? req.user!.userId;
    const ok = await service.update(req.params.id as string, userId, req.body);
    if (!ok) return res.status(403).json({ error: 'Unauthorized' });
    res.json({ message: 'Updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

savingsRouter.delete('/:id', requireWrite('savings'), async (req: AuthRequest, res) => {
  try {
    const userId = req.effectiveUserId ?? req.user!.userId;
    const ok = await service.delete(req.params.id as string, userId);
    if (!ok) return res.status(403).json({ error: 'Unauthorized' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

savingsRouter.post('/:id/deposit', requireWrite('savings'), async (req: AuthRequest, res) => {
  try {
    const userId = req.effectiveUserId ?? req.user!.userId;
    const ok = await service.addDeposit(req.params.id as string, userId, req.body.amount);
    if (!ok) return res.status(403).json({ error: 'Unauthorized' });
    res.json({ message: 'Deposit added' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});