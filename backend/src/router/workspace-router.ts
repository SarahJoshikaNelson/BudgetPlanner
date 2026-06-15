// ─────────────────────────────────────────────────────────────────────────────
// workspace-router.ts  (backend)
//
// CHANGES:
//   • /:id/messages GET + POST removed (chat feature removed).
// ─────────────────────────────────────────────────────────────────────────────

import express from 'express';
import { WorkspaceService } from '../service/workspace-service';
import { authMiddleware, AuthRequest } from '../middleware/auth-middleware';

export const workspaceRouter = express.Router();
const workspaceService = new WorkspaceService();

const param = (p: string | string[]): string => (Array.isArray(p) ? p[0] : p);

// ── INVITATIONS ───────────────────────────────────────────────────────────────

workspaceRouter.post('/requests', async (req: AuthRequest, res) => {
  const { toEmail, inviteType, customPermissions } = req.body;
  if (!toEmail)    return res.status(400).json({ error: 'toEmail required' });
  if (!inviteType) return res.status(400).json({ error: 'inviteType required' });

  const validTypes = ['view', 'write', 'custom', 'shareAcc'];
  if (!validTypes.includes(inviteType)) {
    return res.status(400).json({ error: `inviteType must be one of: ${validTypes.join(', ')}` });
  }

  if (inviteType === 'custom') {
    if (!customPermissions) {
      return res.status(400).json({ error: 'customPermissions required when inviteType is custom' });
    }
    const validPerms = ['none', 'view', 'write'];
    const sections   = ['transactions', 'savings', 'notes', 'dashboard'];
    for (const section of sections) {
      if (!validPerms.includes(customPermissions[section])) {
        return res.status(400).json({ error: `customPermissions.${section} must be one of: ${validPerms.join(', ')}` });
      }
    }
  }

  try {
    const data = await workspaceService.sendInvitation(req.user!.userId, toEmail, inviteType, customPermissions);
    res.status(201).json(data);
  } catch (err: any) {
    if (err.message === 'USER_NOT_FOUND')    return res.status(404).json({ error: 'User not found' });
    if (err.message === 'ALREADY_SENT')      return res.status(409).json({ error: 'Invitation already pending' });
    if (err.message === 'ALREADY_CONNECTED') return res.status(409).json({ error: 'Already connected with this user' });
    if (err.message === 'SELF_INVITE')       return res.status(400).json({ error: 'Cannot invite yourself' });
    console.error('[workspace-router] sendInvitation error:', err);
    res.status(500).json({ error: 'Server error processing request' });
  }
});

workspaceRouter.get('/requests/sent', async (req: AuthRequest, res) => {
  try {
    res.json(await workspaceService.getSentInvitations(req.user!.userId));
  } catch (err) {
    console.error('[workspace-router] getSentInvitations error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

workspaceRouter.get('/requests/received', async (req: AuthRequest, res) => {
  try {
    res.json(await workspaceService.getReceivedInvitations(req.user!.userId));
  } catch (err) {
    console.error('[workspace-router] getReceivedInvitations error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

workspaceRouter.post('/requests/:id/accept', async (req: AuthRequest, res) => {
  try {
    const result = await workspaceService.acceptInvitation(param(req.params['id']), req.user!.userId);
    res.json(result);
  } catch (err: any) {
    if (err.message === 'INVITATION_NOT_FOUND') return res.status(404).json({ error: 'Invitation not found' });
    if (err.message === 'UNAUTHORIZED')         return res.status(403).json({ error: 'Unauthorized' });
    if (err.message === 'ALREADY_CONNECTED')    return res.status(409).json({ error: 'Already connected' });
    console.error('[workspace-router] acceptInvitation error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

workspaceRouter.post('/requests/:id/decline', async (req: AuthRequest, res) => {
  try {
    await workspaceService.declineInvitation(param(req.params['id']), req.user!.userId);
    res.json({ success: true });
  } catch (err: any) {
    if (err.message === 'NOT_FOUND')    return res.status(404).json({ error: 'Not found' });
    if (err.message === 'UNAUTHORIZED') return res.status(403).json({ error: 'Unauthorized' });
    console.error('[workspace-router] declineInvitation error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── WORKSPACES ────────────────────────────────────────────────────────────────

workspaceRouter.get('/', async (req: AuthRequest, res) => {
  try {
    res.json(await workspaceService.getWorkspaces(req.user!.userId));
  } catch (err) {
    console.error('[workspace-router] getWorkspaces error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

workspaceRouter.get('/:id/members', async (req: AuthRequest, res) => {
  try {
    res.json(await workspaceService.getMembers(param(req.params['id']), req.user!.userId));
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return res.status(403).json({ error: 'Not a member' });
    console.error('[workspace-router] getMembers error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

workspaceRouter.delete('/:id/leave', async (req: AuthRequest, res) => {
  try {
    await workspaceService.leaveWorkspace(param(req.params['id']), req.user!.userId);
    res.json({ success: true });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return res.status(403).json({ error: 'Unauthorized' });
    console.error('[workspace-router] leaveWorkspace error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

workspaceRouter.delete('/:id/disconnect', async (req: AuthRequest, res) => {
  try {
    await workspaceService.leaveWorkspace(param(req.params['id']), req.user!.userId);
    res.json({ success: true });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return res.status(403).json({ error: 'Unauthorized' });
    console.error('[workspace-router] disconnectShareAcc error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});