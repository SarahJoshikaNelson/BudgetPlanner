// ─────────────────────────────────────────────────────────────────────────────
// ws-readonly.directive.ts
//
// Locks a section when the active workspace only grants 'view' or 'none'.
//
//   <div [wsReadonly]="'transactions'">…</div>
//   <div [wsReadonly]="'notes'">…</div>
//
// Behaviour:
//   • 'write' or null (own account) → no change.
//   • 'view'  → pointer-events: none on interactive children (buttons, inputs,
//               links, selects, textareas), opacity 0.75, default cursor,
//               data-ws-readonly="true" attribute for the CSS badge.
//   • 'none'  → display: none (hidden entirely).
// ─────────────────────────────────────────────────────────────────────────────

import { Directive, ElementRef, Input, computed, effect, inject } from '@angular/core';
import { WorkspaceService } from './workspace.service';
import { WorkspacePermissions } from '../models/workspaceModel';

type Section = keyof WorkspacePermissions;

const INTERACTIVE = 'button, a, input, select, textarea, [role="button"], [tabindex]';

@Directive({
  selector: '[wsReadonly]',
  standalone: true,
})
export class WsReadonlyDirective {
  private readonly ws  = inject(WorkspaceService);
  private readonly el  = inject(ElementRef<HTMLElement>);

  @Input({ required: true, alias: 'wsReadonly' }) section!: Section;

  private readonly perm = computed(() =>
    this.ws.activePermissions()?.[this.section] ?? null
  );

  constructor() {
    effect(() => {
      const p    = this.perm();
      const host = this.el.nativeElement as HTMLElement;

      // ── Reset all previous state ──────────────────────────────────────────
      host.style.removeProperty('pointer-events');
      host.style.removeProperty('opacity');
      host.style.removeProperty('user-select');
      host.style.removeProperty('display');
      host.style.removeProperty('cursor');
      host.removeAttribute('data-ws-readonly');
      host.removeAttribute('aria-disabled');

      // Restore any previously frozen children.
      host.querySelectorAll<HTMLElement>('[data-ws-frozen]').forEach(el => {
        el.style.removeProperty('pointer-events');
        el.style.removeProperty('cursor');
        el.removeAttribute('data-ws-frozen');
      });

      // ── Own account or full write ─────────────────────────────────────────
      if (p === null || p === 'write') return;

      // ── None → hide ───────────────────────────────────────────────────────
      if (p === 'none') {
        host.style.display = 'none';
        return;
      }

      // ── View → read-only visual lock ──────────────────────────────────────
      // Host wrapper
      host.style.cursor       = 'not-allowed';
      host.style.userSelect   = 'text'; // still allow text selection/copy
      host.style.opacity      = '0.75';
      host.setAttribute('data-ws-readonly', 'true');
      host.setAttribute('aria-disabled', 'true');

      // Freeze every interactive child so clicks have absolutely no effect
      // (pointer-events: none on the host alone doesn't stop child events
      //  in all browser/Angular combinations).
      host.querySelectorAll<HTMLElement>(INTERACTIVE).forEach(el => {
        el.style.pointerEvents = 'none';
        el.style.cursor        = 'not-allowed';
        el.setAttribute('data-ws-frozen', 'true');
      });
    });
  }
}