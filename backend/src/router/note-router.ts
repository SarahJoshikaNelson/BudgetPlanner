import express from 'express';
import { NoteService } from '../service/note-service';
import { authMiddleware, AuthRequest } from '../middleware/auth-middleware';
import { requireWrite } from '../middleware/workspace-context-middleware';

export const noteRouter = express.Router();
const service = new NoteService();
noteRouter.use(authMiddleware);

noteRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.effectiveUserId ?? req.user!.userId;
    res.json(await service.getAll(userId));
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

noteRouter.get('/:id', async (req, res) => {
  try {
    const note = await service.getById(req.params.id);
    if (!note) return res.status(404).json({ error: 'Not found' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

noteRouter.post('/', requireWrite('notes'), async (req: AuthRequest, res) => {
  try {
    const userId = req.effectiveUserId ?? req.user!.userId;
    const id = await service.create(userId, req.body);
    res.json(await service.getById(id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

noteRouter.put('/:id', requireWrite('notes'), async (req: AuthRequest, res) => {
  try {
    const userId = req.effectiveUserId ?? req.user!.userId;
    const ok = await service.update(req.params.id as string, userId, req.body);
    if (!ok) return res.status(403).json({ error: 'Unauthorized' });
    res.json(await service.getById(req.params.id as string));
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

noteRouter.delete('/:id', requireWrite('notes'), async (req: AuthRequest, res) => {
  try {
    const userId = req.effectiveUserId ?? req.user!.userId;
    const ok = await service.delete(req.params.id as string, userId);
    if (!ok) return res.status(403).json({ error: 'Unauthorized' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});