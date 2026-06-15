// ─────────────────────────────────────────────────────────────────────────────
// workspace.service.ts  (Angular frontend)
//
// CHANGES:
//   • Chat signals, chat polling, sendMessage, loadMessages removed entirely.
//   • pauseChatPolling() kept as a harmless no-op for compatibility with
//     SharedComponent.ngOnDestroy (avoids a compile error during migration).
//   • activeWsId is persisted to localStorage under 'activeWsId'.
//   • Constructor restores activeWsId on app boot.
//   • exitWorkspace() is NOT called on /shared destroy.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { firstValueFrom } from 'rxjs';
import {
  Workspace, WorkspaceMember, WorkspaceRequest, WorkspacePermissions,
  AccessType, avatarColor, initial,
  formatLastSeen, buildActivity, canAccessRoute,
} from '../models/workspaceModel';

const API = '/api/workspaces';

/** Storage key shared with the HttpInterceptor. */
export const ACTIVE_WS_STORAGE_KEY = 'activeWsId';

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly _workspaces       = signal<Workspace[]>([]);
  private readonly _members          = signal<WorkspaceMember[]>([]);
  private readonly _sentRequests     = signal<WorkspaceRequest[]>([]);
  private readonly _receivedRequests = signal<WorkspaceRequest[]>([]);
  private readonly _isLoading        = signal(false);
  private readonly _activeWsId       = signal<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem(ACTIVE_WS_STORAGE_KEY) : null,
  );
  private readonly _isTransitioning  = signal(false);

  workspaces        = computed(() => this._workspaces());
  members           = computed(() => this._members());
  sentRequests      = computed(() => this._sentRequests());
  receivedRequests  = computed(() => this._receivedRequests());
  isLoading         = computed(() => this._isLoading());
  activeWorkspaceId = computed(() => this._activeWsId());
  isInWorkspace     = computed(() => !!this._activeWsId());
  isTransitioning   = computed(() => this._isTransitioning());

  activeWorkspace = computed(() =>
    this._workspaces().find(w => w.id === this._activeWsId()) ?? null
  );

  activePermissions = computed<WorkspacePermissions | null>(
    () => this.activeWorkspace()?.myPermissions ?? null
  );

  guestWorkspaces = computed(() =>
    this._workspaces().filter((w: any) => w.direction === 'guest')
  );
  ownerWorkspaces = computed(() =>
    this._workspaces().filter((w: any) => w.direction === 'owner')
  );

  canAccess(route: string): boolean {
    return canAccessRoute(route, this.activePermissions());
  }

  constructor() {
    if (this.auth.checkLoggedIn()) {
      this.loadAll().then(() => {
        const id = this._activeWsId();
        if (id && !this._workspaces().some(w => w.id === id)) {
          this.clearActive();
        } else if (id) {
          this.loadMembers(id);
        }
      });
    }
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  async loadAll() {
    this._isLoading.set(true);
    try {
      await Promise.all([
        this.loadWorkspaces(),
        this.loadSentRequests(),
        this.loadReceivedRequests(),
      ]);
    } finally {
      this._isLoading.set(false);
    }
  }

  async loadWorkspaces() {
    const raw = await firstValueFrom(this.http.get<any[]>(API));
    this._workspaces.set((raw ?? []).map(w => this.mapWorkspace(w)));
  }

  private mapWorkspace(w: any): Workspace {
  const isOnline = w.partnerLastActiveAt
    ? (Date.now() - new Date(w.partnerLastActiveAt).getTime()) < 5 * 60_000
    : false;
  return {
    id: w.id, name: w.name, ownerId: w.ownerId,
    myRole: w.myRole,
    isShareAcc: w.isShareAcc ?? (w.inviteType === 'shareAcc'),
    myPermissions: this.normalizePerms(w.myPermissions),
    memberList: w.memberList ?? [], memberNames: w.memberNames ?? '',
    income: w.income ?? 0, expenses: w.expenses ?? 0, saved: w.saved ?? 0,
    direction: w.direction ?? 'guest',
    ownerColor:  w.ownerColor  ?? '#7B50DC', // ← added
    memberColor: w.memberColor ?? '#4F8FDC', // ← added
    partnerOnline: isOnline,
    partnerLastSeen: formatLastSeen(w.partnerLastActiveAt),
    activity: buildActivity(w.activity ?? w.recentActivity ?? []),
  };
}

  private normalizePerms(p: any): WorkspacePermissions {
    return {
      dashboard:    p?.dashboard    ?? 'none',
      transactions: p?.transactions ?? 'none',
      savings:      p?.savings      ?? 'none',
      notes:        p?.notes        ?? 'none',
    };
  }

  async loadSentRequests() {
    const raw = await firstValueFrom(this.http.get<any[]>(`${API}/requests/sent`));
    this._sentRequests.set(
      (raw ?? []).map((r, i) => ({
        ...r,
        accessType: r.inviteType ?? r.accessType,
        name: r.toEmail ?? '?',
        initial: (r.toEmail ?? '?').charAt(0).toUpperCase(),
        colorClass: avatarColor(i),
      }))
    );
  }

  async loadReceivedRequests() {
    const raw = await firstValueFrom(this.http.get<any[]>(`${API}/requests/received`));
    this._receivedRequests.set(
      (raw ?? []).map((r, i) => ({
        ...r,
        accessType: r.inviteType ?? r.accessType,
        name: r.fromName ?? 'Unknown',
        initial: initial(r.fromName ?? 'U'),
        colorClass: avatarColor(i + 3),
      }))
    );
  }

  // ── Requests ──────────────────────────────────────────────────────────────

  async sendRequest(
    toEmail: string,
    inviteType: AccessType,
    customPermissions?: WorkspacePermissions,
  ) {
    const body: Record<string, unknown> = { toEmail, inviteType };
    if (inviteType === 'custom') body['customPermissions'] = customPermissions;
    await firstValueFrom(this.http.post(`${API}/requests`, body));
    await this.loadSentRequests();
  }

  async acceptRequest(requestId: string) {
    const result = await firstValueFrom(
      this.http.post<{ workspaceId: string; workspaceName: string; inviteType: AccessType }>(
        `${API}/requests/${requestId}/accept`, {},
      )
    );
    await this.loadAll();
    return result;
  }

  async declineRequest(requestId: string) {
    await firstValueFrom(this.http.post(`${API}/requests/${requestId}/decline`, {}));
    await this.loadReceivedRequests();
  }

  // ── Workspace Entry ───────────────────────────────────────────────────────

  private setActive(wsId: string | null) {
    this._activeWsId.set(wsId);
    if (typeof localStorage !== 'undefined') {
      if (wsId) localStorage.setItem(ACTIVE_WS_STORAGE_KEY, wsId);
      else      localStorage.removeItem(ACTIVE_WS_STORAGE_KEY);
    }
  }

  private clearActive() {
    this.setActive(null);
    this._members.set([]);
  }

  enterWorkspace(wsId: string) {
    this.setActive(wsId);
    this.loadMembers(wsId);
  }

  async enterWorkspaceAnimated(wsId: string) {
    this._isTransitioning.set(true);
    await new Promise(r => setTimeout(r, 350));
    this.setActive(wsId);
    await this.loadMembers(wsId);
    await new Promise(r => setTimeout(r, 250));
    this._isTransitioning.set(false);
  }

  exitWorkspace() {
    this.clearActive();
  }

  async leaveActiveWorkspaceAnimated() {
    this._isTransitioning.set(true);
    await new Promise(r => setTimeout(r, 350));
    this.exitWorkspace();
    await new Promise(r => setTimeout(r, 250));
    this._isTransitioning.set(false);
  }

  leaveActiveWorkspace() {
    this.exitWorkspace();
  }

  /** No-op kept for compatibility with existing ngOnDestroy calls. */
  pauseChatPolling() {}

  async leaveWorkspace(wsId: string) {
    await firstValueFrom(this.http.delete(`${API}/${wsId}/leave`));
    if (this._activeWsId() === wsId) this.exitWorkspace();
    await this.loadWorkspaces();
  }

  async disconnectShareAcc(wsId: string) {
    await firstValueFrom(this.http.delete(`${API}/${wsId}/disconnect`));
    await this.loadWorkspaces();
  }

  // ── Members ───────────────────────────────────────────────────────────────

  async loadMembers(wsId: string) {
    const raw = await firstValueFrom(this.http.get<any[]>(`${API}/${wsId}/members`));
    this._members.set(
      (raw ?? []).map((m, i) => ({
        ...m,
        permissions: this.normalizePerms(m.permissions),
        initial: initial(m.name), colorClass: avatarColor(i),
        roleIcon: m.role === 'owner' ? '👑' : '👤',
        workspaceId: wsId,
        workspaceName: this._workspaces().find(w => w.id === wsId)?.name ?? '',
        overviewOpen: false,
        chatOpen: false,
      }))
    );
  }

  toggleMemberOverview(member: WorkspaceMember | undefined) {
    if (!member) return;
    this._members.update(list =>
      list.map(m => m.userId === member.userId ? { ...m, overviewOpen: !m.overviewOpen } : m)
    );
  }
}