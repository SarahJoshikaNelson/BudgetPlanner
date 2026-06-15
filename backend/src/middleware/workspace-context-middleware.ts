// ─────────────────────────────────────────────────────────────────────────────
// workspace-context-middleware.ts
//
// Reads the X-Workspace-Id header (or auto-detects an active shareAcc link)
// and decorates the request with:
//
//   req.effectiveUserId  → which user_id queries should target
//   req.workspacePerms   → { transactions, savings, notes, dashboard }
//   req.workspaceId      → resolved workspace id (or null)
//   req.workspaceRole    → 'owner' | 'editor' | 'viewer' | null
//
// Mount this AFTER your auth middleware (so req.user is populated) and
// BEFORE your transactions/notes/savings routers.
// ─────────────────────────────────────────────────────────────────────────────

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth-middleware';
import { workspaceService, WorkspacePermissions } from '../service/workspace-service';

declare module 'express-serve-static-core' {
  interface Request {
    effectiveUserId?: number;
    workspaceId?:     string | null;
    workspacePerms?:  WorkspacePermissions;
    workspaceRole?:   'owner' | 'editor' | 'viewer' | null;
  }
}

export async function workspaceContextMiddleware(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) {
  // No user (public route) — skip.
  if (!req.user) return next();

  const header = req.header('x-workspace-id');
  const wsId   = header && header.trim() ? header.trim() : null;

  try {
    const ctx = await workspaceService.getEffectiveContext(req.user.userId, wsId);
    req.effectiveUserId = ctx.effectiveUserId;
    req.workspaceId     = ctx.workspaceId;
    req.workspacePerms  = ctx.perms;
    req.workspaceRole   = ctx.role;
  } catch (err) {
    console.error('[workspaceContext] resolve failed; falling back to self:', err);
    req.effectiveUserId = req.user.userId;
    req.workspaceId     = null;
    req.workspacePerms  = { transactions: 'write', savings: 'write', notes: 'write', dashboard: 'write' };
    req.workspaceRole   = null;
  }
  next();
}

/**
 * Route-level guard for write operations.
 * Use:  router.post('/', workspaceContextMiddleware, requireWrite('transactions'), handler)
 * (Reads are allowed whenever perm !== 'none'; you generally don't need a
 * separate read guard because the data query is scoped to effectiveUserId.)
 */
export function requireWrite(section: keyof WorkspacePermissions) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const perm = req.workspacePerms?.[section];
    if (perm !== 'write') {
      return res.status(403).json({
        error: `No write permission for ${section} in this workspace`,
      });
    }
    next();
  };
}

/**
 * Optional read guard — blocks responses when perm === 'none'.
 * Use for sections that should be hidden entirely, e.g. notes.
 */
export function requireRead(section: keyof WorkspacePermissions) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const perm = req.workspacePerms?.[section];
    if (perm === 'none') {
      return res.status(403).json({ error: `No access to ${section}` });
    }
    next();
  };
}