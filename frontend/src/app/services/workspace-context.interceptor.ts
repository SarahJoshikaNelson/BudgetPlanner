// ─────────────────────────────────────────────────────────────────────────────
// workspace-context.interceptor.ts
//
// Attaches X-Workspace-Id: <activeWsId> to every /api/* request.
// Reads directly from localStorage to avoid a circular DI between
// HttpClient and WorkspaceService.
//
// Skips:
//   • non-/api/ URLs
//   • the /api/workspaces/* router itself (workspace CRUD must always run
//     against the logged-in user, never the proxied workspace owner)
//   • /api/auth/*  (login/register/refresh/logout)
//   • /api/users/me
// ─────────────────────────────────────────────────────────────────────────────

import { HttpInterceptorFn } from '@angular/common/http';
import { ACTIVE_WS_STORAGE_KEY } from './workspace.service';

const SKIP_PREFIXES = [
  '/api/workspaces',
  '/api/auth',
  '/api/users/me',
];

function shouldSkip(url: string): boolean {
  // Allow absolute URLs by matching on pathname.
  let path = url;
  try {
    if (/^https?:\/\//.test(url)) path = new URL(url).pathname;
  } catch { /* keep as-is */ }
  if (!path.startsWith('/api/')) return true;
  return SKIP_PREFIXES.some(p => path.startsWith(p));
}

export const workspaceContextInterceptor: HttpInterceptorFn = (req, next) => {
  if (shouldSkip(req.url)) return next(req);

  const wsId = typeof localStorage !== 'undefined'
    ? localStorage.getItem(ACTIVE_WS_STORAGE_KEY)
    : null;

  if (!wsId) return next(req);

  return next(req.clone({ setHeaders: { 'X-Workspace-Id': wsId } }));
};