import { supabase } from '../supabase';
import { randomUUID } from 'crypto';

export type Permission = 'none' | 'view' | 'write';
export type Role       = 'owner' | 'editor' | 'viewer';
export type InviteType = 'view' | 'write' | 'custom' | 'shareAcc';

export interface WorkspacePermissions {
  transactions: Permission;
  savings:      Permission;
  notes:        Permission;
  dashboard:    Permission;
}

export interface EffectiveContext {
  effectiveUserId: number;
  perms: WorkspacePermissions;
  workspaceId: string | null;
  role: Role | null;
  inviteType: InviteType | null;
}

function resolvePermissions(inviteType: InviteType, custom?: WorkspacePermissions): WorkspacePermissions {
  switch (inviteType) {
    case 'view':     return { transactions: 'view',  savings: 'view',  notes: 'view',  dashboard: 'view'  };
    case 'write':    return { transactions: 'write', savings: 'write', notes: 'write', dashboard: 'write' };
    case 'shareAcc': return { transactions: 'write', savings: 'write', notes: 'write', dashboard: 'write' };
    case 'custom':   return custom ?? { transactions: 'view', savings: 'view', notes: 'view', dashboard: 'view' };
  }
}

function resolveRole(inviteType: InviteType): Role {
  return (inviteType === 'write' || inviteType === 'shareAcc') ? 'editor' : 'viewer';
}

function permsToColumns(p: WorkspacePermissions) {
  return {
    perm_transactions: p.transactions,
    perm_savings:      p.savings,
    perm_notes:        p.notes,
    perm_dashboard:    p.dashboard,
  };
}

function columnsToPerms(row: any): WorkspacePermissions {
  return {
    transactions: row.perm_transactions as Permission,
    savings:      row.perm_savings      as Permission,
    notes:        row.perm_notes        as Permission,
    dashboard:    row.perm_dashboard    as Permission,
  };
}

const OWNER_PERMS: WorkspacePermissions = {
  transactions: 'write', savings: 'write', notes: 'write', dashboard: 'write',
};

const SELF_CONTEXT = (userId: number): EffectiveContext => ({
  effectiveUserId: userId,
  perms:           OWNER_PERMS,
  workspaceId:     null,
  role:            null,
  inviteType:      null,
});

export class WorkspaceService {

  public async sendInvitation(
    fromUserId: number,
    toEmail: string,
    inviteType: InviteType,
    customPermissions?: WorkspacePermissions,
  ) {
    const { data: self } = await supabase
      .from('users').select('email').eq('id', fromUserId).single();
    if (self?.email === toEmail) throw new Error('SELF_INVITE');

    const { data: recipient } = await supabase
      .from('users').select('id').eq('email', toEmail).single();
    if (!recipient) throw new Error('USER_NOT_FOUND');

    const { data: existingPending } = await supabase
      .from('workspace_requests')
      .select('id')
      .eq('from_user_id', fromUserId)
      .eq('to_email', toEmail)
      .eq('status', 'pending')
      .maybeSingle();
    if (existingPending) throw new Error('ALREADY_SENT');

    const { data: existingWorkspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('requester_id', fromUserId)
      .eq('owner_id', recipient.id)
      .maybeSingle();
    if (existingWorkspace) throw new Error('ALREADY_CONNECTED');

    const serializedPermissions = inviteType === 'custom' && customPermissions
      ? typeof customPermissions === 'string' ? customPermissions : JSON.stringify(customPermissions)
      : null;

    const { data, error } = await supabase
      .from('workspace_requests')
      .insert({
        id:           randomUUID(),
        from_user_id: fromUserId,
        to_email:     toEmail,
        invite_type:  inviteType,
        permissions:  serializedPermissions,
        status:       'pending',
        created_at:   new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  public async getSentInvitations(userId: number) {
    const { data: rows } = await supabase
      .from('workspace_requests').select('*')
      .eq('from_user_id', userId)
      .order('created_at', { ascending: false });
    return (rows ?? []).map(r => ({
      id: r.id, toEmail: r.to_email, inviteType: r.invite_type as InviteType,
      status: r.status, createdAt: r.created_at,
    }));
  }

  public async getReceivedInvitations(userId: number) {
    const { data: user } = await supabase
      .from('users').select('email').eq('id', userId).single();
    if (!user) return [];
    const { data: rows } = await supabase
      .from('workspace_requests')
      .select('*, users!workspace_requests_from_user_id_fkey(id, name)')
      .eq('to_email', user.email).eq('status', 'pending')
      .order('created_at', { ascending: false });
    return (rows ?? []).map(r => ({
      id: r.id, fromUserId: r.from_user_id, fromName: r.users?.name ?? 'Unknown',
      inviteType: r.invite_type as InviteType, status: r.status, createdAt: r.created_at,
    }));
  }

  public async acceptInvitation(requestId: string, acceptingUserId: number) {
    const { data: invitation } = await supabase
      .from('workspace_requests')
      .select('*, users!workspace_requests_from_user_id_fkey(id, name)')
      .eq('id', requestId).eq('status', 'pending').single();
    if (!invitation) throw new Error('INVITATION_NOT_FOUND');

    const { data: acceptingUser } = await supabase
      .from('users').select('email, name').eq('id', acceptingUserId).single();
    if (!acceptingUser || acceptingUser.email !== invitation.to_email)
      throw new Error('UNAUTHORIZED');

    const inviteType = invitation.invite_type as InviteType;

    let customPermissions: WorkspacePermissions | undefined = undefined;
    if (inviteType === 'custom' && invitation.permissions) {
      customPermissions = typeof invitation.permissions === 'string'
        ? JSON.parse(invitation.permissions) : invitation.permissions;
    }

    const permissions   = resolvePermissions(inviteType, customPermissions);
    const recipientRole = resolveRole(inviteType);

    const { data: alreadyExists } = await supabase
      .from('workspaces').select('id')
      .eq('requester_id', invitation.from_user_id)
      .eq('owner_id', acceptingUserId).maybeSingle();
    if (alreadyExists) throw new Error('ALREADY_CONNECTED');

    const workspaceId   = randomUUID();
    const now           = new Date().toISOString();
    const workspaceName = `${invitation.users?.name ?? 'User'} ↔ ${acceptingUser.name}`;

    await supabase.from('workspaces').insert({
      id: workspaceId, name: workspaceName,
      owner_id: acceptingUserId, requester_id: invitation.from_user_id,
      invite_type: inviteType, created_at: now,
    });

    await supabase.from('workspace_members').insert({
      workspace_id: workspaceId,
      user_id:      invitation.from_user_id,
      role:         recipientRole,
      ...permsToColumns(permissions),
      joined_at:    now,
    });

    if (inviteType === 'shareAcc') {
      await supabase.from('workspace_members').insert({
        workspace_id: workspaceId,
        user_id:      acceptingUserId,
        role:         'owner',
        ...permsToColumns(OWNER_PERMS),
        joined_at:    now,
      });
    }

    await supabase.from('workspace_requests')
      .update({ status: 'accepted' }).eq('id', requestId);

    return { workspaceId, workspaceName, inviteType };
  }

  public async declineInvitation(requestId: string, userId: number) {
    const { data: user } = await supabase
      .from('users').select('email').eq('id', userId).single();
    if (!user) throw new Error('UNAUTHORIZED');
    const { data: invitation } = await supabase
      .from('workspace_requests').select('id')
      .eq('id', requestId).eq('to_email', user.email).single();
    if (!invitation) throw new Error('NOT_FOUND');
    await supabase.from('workspace_requests')
      .update({ status: 'declined' }).eq('id', requestId);
    return true;
  }

  public async getEffectiveContext(
    requesterUserId: number,
    workspaceId: string | null,
  ): Promise<EffectiveContext> {
    if (workspaceId) {
      const { data: ws } = await supabase
        .from('workspaces')
        .select('id, owner_id, requester_id, invite_type')
        .eq('id', workspaceId)
        .maybeSingle();
      if (!ws) return SELF_CONTEXT(requesterUserId);

      if (ws.owner_id === requesterUserId) {
        return {
          effectiveUserId: requesterUserId,
          perms: OWNER_PERMS,
          workspaceId: ws.id,
          role: 'owner',
          inviteType: ws.invite_type as InviteType,
        };
      }

      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role, perm_transactions, perm_savings, perm_notes, perm_dashboard')
        .eq('workspace_id', ws.id)
        .eq('user_id', requesterUserId)
        .maybeSingle();
      if (!membership) return SELF_CONTEXT(requesterUserId);

      return {
        effectiveUserId: ws.owner_id,
        perms:           columnsToPerms(membership),
        workspaceId:     ws.id,
        role:            membership.role as Role,
        inviteType:      ws.invite_type as InviteType,
      };
    }

    const { data: shareAccLink } = await supabase
      .from('workspaces')
      .select('id, owner_id, requester_id, invite_type')
      .eq('requester_id', requesterUserId)
      .eq('invite_type', 'shareAcc')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (shareAccLink) {
      return {
        effectiveUserId: shareAccLink.owner_id,
        perms:           OWNER_PERMS,
        workspaceId:     shareAccLink.id,
        role:            'editor',
        inviteType:      'shareAcc',
      };
    }

    return SELF_CONTEXT(requesterUserId);
  }

  public async getWorkspaces(userId: number) {
    const { data: asGuest } = await supabase
      .from('workspace_members')
      .select(`
        workspace_id, role,
        perm_transactions, perm_savings, perm_notes, perm_dashboard,
        workspaces!inner(
          id, name, owner_id, requester_id, invite_type,
          users!workspaces_owner_id_fkey(id, name, profile_color)
        )
      `)
      .eq('user_id', userId);

    const { data: asOwner } = await supabase
      .from('workspaces')
      .select(`
        id, name, owner_id, requester_id, invite_type,
        users!workspaces_requester_id_fkey(id, name, profile_color)
      `)
      .eq('owner_id', userId);

    const guestWorkspaces = (asGuest ?? [])
      .filter((m: any) => m.workspaces.owner_id !== userId)
      .map((m: any) => {
        const ws    = m.workspaces;
        const owner = ws.users;
        return {
          id: ws.id, name: ws.name,
          ownerId: ws.owner_id, ownerName: owner?.name ?? 'Unknown',
          requesterId: ws.requester_id,
          inviteType: ws.invite_type as InviteType,
          isShareAcc: ws.invite_type === 'shareAcc',
          myRole: m.role as Role, myPermissions: columnsToPerms(m),
          memberNames: owner?.name ?? 'Unknown',
          ownerColor: owner?.profile_color ?? '#7B50DC', // ← added
          direction: 'guest' as const,
          income: 0, expenses: 0, saved: 0,
        };
      });

    const ownerWorkspaces = (asOwner ?? []).map((ws: any) => {
      const requester = ws.users;
      return {
        id: ws.id, name: ws.name,
        ownerId: ws.owner_id, ownerName: 'Du',
        requesterId: ws.requester_id,
        requesterName: requester?.name ?? 'Unknown',
        inviteType: ws.invite_type as InviteType,
        isShareAcc: ws.invite_type === 'shareAcc',
        myRole: 'owner' as const,
        myPermissions: OWNER_PERMS,
        memberNames: requester?.name ?? 'Unknown',
        memberColor: requester?.profile_color ?? '#4F8FDC', // ← added
        direction: 'owner' as const,
        income: 0, expenses: 0, saved: 0,
      };
    });

    return [...guestWorkspaces, ...ownerWorkspaces];
  }

  public async getMembers(workspaceId: string, requestingUserId: number) {
    const { data: ws } = await supabase
      .from('workspaces').select('owner_id, requester_id, invite_type')
      .eq('id', workspaceId).single();
    if (!ws) throw new Error('UNAUTHORIZED');

    const isOwner     = ws.owner_id     === requestingUserId;
    const isRequester = ws.requester_id === requestingUserId;
    if (!isOwner && !isRequester) throw new Error('UNAUTHORIZED');

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('perm_transactions, perm_savings, perm_notes, perm_dashboard, role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', ws.requester_id)
      .maybeSingle();

    const { data: owner } = await supabase
      .from('users').select('id, name').eq('id', ws.owner_id).single();

    const { data: transactions } = await supabase
      .from('transactions').select('type, amount').eq('user_id', ws.owner_id);
    const income   = (transactions ?? []).filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = (transactions ?? []).filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const { data: expRows } = await supabase
      .from('transactions').select('category')
      .eq('user_id', ws.owner_id).eq('type', 'expense');
    const catCount: Record<string, number> = {};
    (expRows ?? []).forEach((t: any) => { catCount[t.category] = (catCount[t.category] ?? 0) + 1; });
    const topCategory = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

    const { data: savings } = await supabase
      .from('savings_goals').select('current_amount').eq('user_id', ws.owner_id);
    const saved = (savings ?? []).reduce((s, g) => s + g.current_amount, 0);

    return [{
      userId: owner!.id, name: owner!.name, role: 'owner' as const,
      permissions: membership ? columnsToPerms(membership) : OWNER_PERMS,
      stats: { income, expenses, saved, topCategory },
    }];
  }

  public async leaveWorkspace(workspaceId: string, userId: number) {
    const { data: ws } = await supabase
      .from('workspaces').select('owner_id, requester_id').eq('id', workspaceId).single();
    if (!ws) throw new Error('NOT_FOUND');
    if (ws.owner_id !== userId && ws.requester_id !== userId) throw new Error('UNAUTHORIZED');

    await supabase.from('workspace_members').delete().eq('workspace_id', workspaceId);
    await supabase.from('workspaces').delete().eq('id', workspaceId);
    return true;
  }
}

export const workspaceService = new WorkspaceService();