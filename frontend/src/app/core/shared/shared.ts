import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspaceService } from '../../services/workspace.service';
import {
  WorkspaceMember, WorkspaceRequest, WorkspacePermissions,
  AccessType, Permission, PermissionArea,
  INVITE_TYPE_META, PERMISSION_SECTIONS,
} from '../../models/workspaceModel';

@Component({
  selector:    'app-shared',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './shared.html',
  styleUrls:   ['./shared.css'],
})
export class SharedComponent implements OnInit, OnDestroy {
  readonly ws = inject(WorkspaceService);

  workspaces         = this.ws.workspaces;
  guestWorkspaces    = this.ws.guestWorkspaces;
  ownerWorkspaces    = this.ws.ownerWorkspaces;
  members            = this.ws.members;
  sentRequests       = this.ws.sentRequests;
  receivedRequests   = this.ws.receivedRequests;
  isLoading          = this.ws.isLoading;
  isTransitioning    = this.ws.isTransitioning;
  isInWorkspace      = this.ws.isInWorkspace;
  activeWorkspace    = this.ws.activeWorkspace;
  activePermissions  = this.ws.activePermissions;

  myRealUserId = signal<number>(0);

  searchQuery         = '';
  selectedAccessType: AccessType = 'view';
  isSending           = false;
  shareAccConfirmed   = false;
  searchError         = '';

  acceptingRequest:  WorkspaceRequest | null = null;
  isAccepting        = false;

  readonly accessOptions: Array<{ value: AccessType; label: string; desc: string }> = [
    { value: 'view',     label: 'View',       desc: 'Can only read your data' },
    { value: 'write',    label: 'Edit',        desc: 'Can read & edit your data' },
    { value: 'shareAcc', label: 'Shared Acc',  desc: 'Permanent shared account' },
  ];

  readonly permKeys: Array<{ key: PermissionArea; label: string; icon: string }> = [
    { key: 'dashboard',    label: 'Dashboard',    icon: '📊' },
    { key: 'transactions', label: 'Transactions', icon: '💸' },
    { key: 'savings',      label: 'Savings',      icon: '🎯' },
    { key: 'notes',        label: 'Notes',        icon: '📝' },
  ];

  readonly inviteTypeMeta     = INVITE_TYPE_META;
  readonly permissionSections = PERMISSION_SECTIONS;

  get pendingReceivedCount(): number {
    return this.receivedRequests().filter(r => r.status === 'pending').length;
  }

  get sharedModeActive(): boolean {
    return !!this.ws.activeWorkspaceId();
  }

  get activeBannerName(): string {
    return this.ws.activeWorkspace()?.name ?? '';
  }

  get activeBannerMembers(): string {
    return this.ws.activeWorkspace()?.memberNames ?? '';
  }

  get accessHint(): string {
    const hints: Record<AccessType, string> = {
      view:     'The person can see your data — but cannot change anything.',
      write:    'The person can view and edit your data.',
      custom:   'Choose exactly what the person is allowed to do per section.',
      shareAcc: 'Permanent shared account — both users share the same data.',
    };
    return hints[this.selectedAccessType] ?? '';
  }

  ngOnInit(): void {
    this.ws.loadAll();
    const userJson = localStorage.getItem('user');
    if (userJson) this.myRealUserId.set(JSON.parse(userJson).id);

    const shareAccWs = this.ws.guestWorkspaces().find(w => w.isShareAcc);
    if (shareAccWs && !this.ws.activeWorkspaceId()) {
      this.ws.enterWorkspace(shareAccWs.id);
    }
  }

  ngOnDestroy(): void {
    this.ws.pauseChatPolling();
  }

  async sendRequest(): Promise<void> {
    const email = this.searchQuery.trim();
    if (!email) return;
    this.isSending   = true;
    this.searchError = '';
    try {
      await this.ws.sendRequest(email, this.selectedAccessType);
      this.searchQuery       = '';
      this.shareAccConfirmed = false;
    } catch (err: any) {
      const msg = err?.error?.error ?? err?.message ?? 'Error';
      this.searchError = this.translateError(msg);
    } finally {
      this.isSending = false;
    }
  }

  openAcceptModal(req: WorkspaceRequest): void {
    this.acceptingRequest = req;
    this.isAccepting      = false;
  }

  closeModal(): void {
    if (this.isAccepting) return;
    this.acceptingRequest = null;
  }

  async confirmAccept(): Promise<void> {
    if (!this.acceptingRequest || this.isAccepting) return;
    this.isAccepting = true;
    try {
      await this.ws.acceptRequest(this.acceptingRequest.id);
      this.acceptingRequest = null;
    } catch (err) {
      console.error('[SharedComponent] confirmAccept error:', err);
      this.isAccepting = false;
    }
  }

  async declineRequest(req: WorkspaceRequest): Promise<void> {
    try {
      await this.ws.declineRequest(req.id);
      if (this.acceptingRequest?.id === req.id) this.closeModal();
    } catch (err) {
      console.error('[SharedComponent] declineRequest error:', err);
    }
  }

  async enterWorkspace(wsId: string): Promise<void> {
    await this.ws.enterWorkspaceAnimated(wsId);
  }

  async leaveWorkspace(): Promise<void> {
    await this.ws.leaveActiveWorkspaceAnimated();
  }

  async leaveWorkspacePermanently(wsId: string): Promise<void> {
    if (!confirm('Really revoke access?')) return;
    await this.ws.leaveWorkspace(wsId);
  }

  toggleOverview(m: WorkspaceMember | undefined): void {
    this.ws.toggleMemberOverview(m);
  }

  getWorkspaceMember(wsId: string): WorkspaceMember | undefined {
    return this.members().find(m => m.workspaceId === wsId);
  }

  canWrite(section: keyof WorkspacePermissions): boolean {
    return this.activePermissions()?.[section] === 'write';
  }

  canView(section: keyof WorkspacePermissions): boolean {
    const p = this.activePermissions()?.[section];
    return p === 'view' || p === 'write';
  }

  statusLabel(s: string): string {
    return ({ pending: 'Pending', accepted: 'Accepted', declined: 'Declined' })[s] ?? s;
  }

  accessLabel(a: string): string {
    return ({ view: 'View', write: 'Edit', custom: 'Custom', shareAcc: 'Shared Acc' } as Record<string, string>)[a] ?? a;
  }

  permLabel(p: Permission): string {
    return ({ write: 'Write', view: 'Read', none: 'None' })[p] ?? p;
  }

  private translateError(msg: string): string {
    const map: Record<string, string> = {
      'User not found':                   'User not found.',
      'Invitation already pending':       'Request already sent.',
      'Cannot invite yourself':           'You cannot invite yourself.',
      'Already connected with this user': 'You are already connected with this user.',
    };
    return map[msg] ?? msg;
  }
}