// ─────────────────────────────────────────────────────────────────────────────
// workspaceModel.ts
//
// CHANGES:
//   • ChatMessage interface removed (chat feature removed).
//
// CORRECT ASYMMETRIC MODEL:
//   - User A (requester) sends invite: "I want to see your account"
//   - User B (owner)     accepts:      "OK, you can see my data"
//   - Result: A gets access to B's data. B gets nothing back.
//   - B can revoke at any time.
//
// PERMISSION SECTIONS:
//   'transactions' – Income / Expenses
//   'savings'      – Savings Goals
//   'notes'        – Notes
//   'dashboard'    – Dashboard / Charts
//
// INVITE TYPES:
//   'view'     – A can read all of B's sections
//   'write'    – A can read + edit all of B's sections
//   'custom'   – A gets granular per-section permissions into B's data
//   'shareAcc' – Permanent shared account (no enter/leave — always active)
// ─────────────────────────────────────────────────────────────────────────────

export type Permission = 'none' | 'view' | 'write';
export type Role       = 'owner' | 'editor' | 'viewer';
export type InviteType = 'view' | 'write' | 'custom' | 'shareAcc';
export type AccessType = InviteType;

export type PermissionArea = 'dashboard' | 'transactions' | 'savings' | 'notes';

export interface WorkspacePermissions {
  dashboard:    Permission;
  transactions: Permission;
  savings:      Permission;
  notes:        Permission;
}

export const PERMISSION_SECTIONS: Array<{
  key:         keyof WorkspacePermissions;
  label:       string;
  icon:        string;
  description: string;
}> = [
  { key: 'transactions', label: 'Einnahmen & Ausgaben', icon: '📊', description: 'Alle Transaktionen, Kategorien und Budgets' },
  { key: 'savings',      label: 'Sparziele',            icon: '🎯', description: 'Sparziele, Fortschritt und eingezahlte Beträge' },
  { key: 'notes',        label: 'Notizen',              icon: '📝', description: 'Persönliche Notizen und Memos' },
  { key: 'dashboard',    label: 'Dashboard',            icon: '📈', description: 'Übersichts-Charts, Statistiken und Auswertungen' },
];

// ── Invitation / Request ──────────────────────────────────────────────────────

export interface WorkspaceInvitation {
  id:                 string;
  toEmail?:           string;
  fromUserId?:        number;
  fromName?:          string;
  inviteType:         InviteType;
  customPermissions?: WorkspacePermissions;
  status:             'pending' | 'accepted' | 'declined';
  createdAt:          string;
  name:       string;
  initial:    string;
  colorClass: string;
}

export interface WorkspaceRequest {
  id:                 string;
  toEmail?:           string;
  fromUserId?:        number;
  fromName?:          string;
  accessType?:        AccessType;
  customPermissions?: WorkspacePermissions;
  status:             'pending' | 'accepted' | 'declined';
  createdAt:          string;
  name:       string;
  initial:    string;
  colorClass: string;
}

// ── Workspace ─────────────────────────────────────────────────────────────────

export interface ActivityEntry {
  text:     string;
  time:     string;
  isRecent: boolean;
}

export interface Workspace {
  id:            string;
  name:          string;
  ownerId:       number;
  ownerName?:    string;
  myRole:        Role;
  isShareAcc:    boolean;
  myPermissions: WorkspacePermissions;
  memberList:    Array<{ userId: number; name: string }>;
  memberNames:   string;
  direction:     'guest' | 'owner';
  income:        number;
  expenses:      number;
  saved:         number;
  ownerColor?:   string; // ← added
  memberColor?:  string; // ← added
  partnerOnline?:   boolean;
  partnerLastSeen?: string;
  activity?:        ActivityEntry[];
}

// ── Member ─────────────────────────────────────────────────────────────────────

export interface WorkspaceMember {
  userId:      number;
  name:        string;
  role:        Role;
  isShareAcc?: boolean;
  permissions: WorkspacePermissions;
  stats: {
    income:      number;
    expenses:    number;
    saved:       number;
    topCategory: string;
  };
  initial:       string;
  colorClass:    string;
  roleIcon:      string;
  workspaceId:   string;
  workspaceName: string;
  overviewOpen:  boolean;
  chatOpen:      boolean;
}

// ── Permission state (for the invite modal) ───────────────────────────────────

export interface PermissionState extends WorkspacePermissions {
  preset: AccessType | 'custom';
}

// ── Presets ───────────────────────────────────────────────────────────────────

export const INVITE_TYPE_PERMISSIONS: Record<Exclude<InviteType, 'custom'>, WorkspacePermissions> = {
  view:     { dashboard: 'view',  transactions: 'view',  savings: 'view',  notes: 'view'  },
  write:    { dashboard: 'write', transactions: 'write', savings: 'write', notes: 'write' },
  shareAcc: { dashboard: 'view',  transactions: 'view',  savings: 'view',  notes: 'view'  },
};

export const ACCESS_PRESETS: Record<AccessType, WorkspacePermissions> = {
  view:     { dashboard: 'view',  transactions: 'view',  savings: 'view',  notes: 'view'  },
  write:    { dashboard: 'write', transactions: 'write', savings: 'write', notes: 'write' },
  custom:   { dashboard: 'view',  transactions: 'view',  savings: 'view',  notes: 'none'  },
  shareAcc: { dashboard: 'view',  transactions: 'view',  savings: 'view',  notes: 'view'  },
};

export const INVITE_TYPE_META: Record<InviteType, { label: string; icon: string; description: string }> = {
  view:     { label: 'Nur ansehen',       icon: '👁',  description: 'Du kannst alle Bereiche sehen, aber nichts ändern.' },
  write:    { label: 'Bearbeiten',        icon: '✏️',  description: 'Du kannst Daten in allen Bereichen sehen und bearbeiten.' },
  custom:   { label: 'Benutzerdefiniert', icon: '⚙️',  description: 'Lege für jeden Bereich individuelle Rechte fest.' },
  shareAcc: { label: 'Shared Account',   icon: '🔗',  description: 'Dauerhafter gemeinsamer Account — beide Nutzer teilen dieselben Daten.' },
};

// ── Route → Permission mapping ────────────────────────────────────────────────

export const ROUTE_PERMISSION_MAP: Record<string, PermissionArea> = {
  '/dashboard':    'dashboard',
  '/transactions': 'transactions',
  '/savings':      'savings',
  '/notes':        'notes',
};

export function canAccessRoute(route: string, perms: WorkspacePermissions | null): boolean {
  if (!perms) return true;
  const area = ROUTE_PERMISSION_MAP[route];
  if (!area) return true;
  return perms[area] !== 'none';
}

// ── Time / activity helpers ───────────────────────────────────────────────────

export function formatLastSeen(isoString: string | null | undefined): string {
  if (!isoString) return 'Noch nie aktiv';
  const diff  = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  if (mins < 1)   return 'Gerade eben aktiv';
  if (mins < 60)  return `zuletzt aktiv: vor ${mins} Min.`;
  if (hours < 24) return `zuletzt aktiv: vor ${hours} Std.`;
  return 'zuletzt aktiv: gestern';
}

export function buildActivity(raw: any[]): ActivityEntry[] {
  if (!raw?.length) return [];
  return raw.map(e => {
    const diff = Date.now() - new Date(e.createdAt ?? e.time).getTime();
    const mins = Math.floor(diff / 60_000);
    return {
      text: e.text ?? e.description ?? '',
      time: mins < 60
        ? new Date(e.createdAt ?? e.time).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })
        : 'gestern',
      isRecent: mins < 60,
    };
  });
}

// ── UI Helpers ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['av-purple', 'av-blue', 'av-green', 'av-pink', 'av-orange'] as const;
export function avatarColor(i: number): string  { return AVATAR_COLORS[i % AVATAR_COLORS.length]; }
export function initial(name: string): string   { return name?.charAt(0)?.toUpperCase() ?? '?'; }
export function roleIcon(role: Role): string    { return role === 'owner' ? '👑' : '👤'; }
export function isSharedAccMode(t: InviteType): boolean { return t === 'shareAcc'; }
export function defaultPermissions(): WorkspacePermissions {
  return { dashboard: 'view', transactions: 'view', savings: 'view', notes: 'view' };
}