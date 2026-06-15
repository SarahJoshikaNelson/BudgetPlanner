import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy,
  ChangeDetectorRef, ViewChild, ElementRef, inject,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { NoteService } from '../../services/note.service';
import { TransactionService } from '../../services/transactionService';
import { WorkspaceService } from '../../services/workspace.service';
import {
  Note, NoteCategory, NoteFilter, NoteView,
  CATEGORIES, FORMAT_BUTTONS, FormatButton,
} from '../../models/noteModel';

export type NavSection = 'all' | 'favorites';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, MatSnackBarModule],
  templateUrl: './notes.html',
  styleUrl: './notes.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Notes implements OnInit, OnDestroy {
  private readonly svc              = inject(NoteService);
  private readonly cdr              = inject(ChangeDetectorRef);
  private readonly snackBar         = inject(MatSnackBar);
  private readonly txSvc            = inject(TransactionService);
  private readonly workspaceService = inject(WorkspaceService);
  private readonly destroy$         = new Subject<void>();

  // ── Note state ─────────────────────────────────────────
  notes:      Note[]      = [];
  selected:   Note | null = null;
  filter!:    NoteFilter;
  view:       NoteView    = 'list';
  navSection: NavSection  = 'all';
  autoSaved   = false;

  // ── Guide state ────────────────────────────────────────
  guideOpen = false;
  guideTab  = 'create';

  // ── @ shortcut state ───────────────────────────────────
  atPreview: {
    name:    string;
    date:    string;
    amount:  number;
    tag:     string;
    type:    'income' | 'expense';
    rawLine: string;
  } | null = null;

  private dismissedLines = new Set<string>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  readonly categories    = CATEGORIES;
  readonly formatButtons = FORMAT_BUTTONS;

  @ViewChild('editor') editorRef!: ElementRef<HTMLDivElement>;

  // ── View-only computed ─────────────────────────────────
  get isViewOnly(): boolean {
    const p = this.workspaceService.activePermissions();
    if (!p) return false;
    return p.notes !== 'write';
  }

  // ── Lifecycle ──────────────────────────────────────────
  ngOnInit(): void {
    this.svc.filtered$.pipe(takeUntil(this.destroy$)).subscribe(n => {
      this.notes = n;
      this.cdr.markForCheck();
    });

    this.svc.selected$.pipe(takeUntil(this.destroy$)).subscribe(n => {
      const isNewNote = n?.id !== this.selected?.id;
      this.selected = n;
      this.view = n ? 'detail' : 'list';
      if (isNewNote) {
        this.atPreview = null;
        this.dismissedLines.clear();
        setTimeout(() => this.syncEditor(), 0);
      }
      this.cdr.markForCheck();
    });

    this.svc.filter$.pipe(takeUntil(this.destroy$)).subscribe(f => {
      this.filter = f;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ── Navigation ─────────────────────────────────────────
  setNav(section: NavSection): void {
    this.navSection = section;
    this.svc.select(null);
    this.view = 'list';
    this.svc.setFilter({ searchQuery: '' });
  }

  get displayNotes(): Note[] {
    if (this.navSection === 'favorites') return this.notes.filter(n => n.isFavorite);
    return this.notes;
  }

  openNote(note: Note): void { this.svc.select(note); }
  newNote(): void             { if (!this.isViewOnly) this.svc.create('Ideas'); }

  // ── Delete with undo ───────────────────────────────────
  deleteNote(id: string, e: Event): void {
    if (this.isViewOnly) return;
    e.stopPropagation();
    const noteToRestore = this.notes.find(n => n.id === id);
    if (!noteToRestore) return;

    const backup = { ...noteToRestore };
    this.svc.delete(id);

    const ref = this.snackBar.open(
      `"${backup.title}" deleted`,
      'Undo',
      { duration: 4000, panelClass: ['snack-delete'] }
    );

    ref.onAction().subscribe(() => {
      this.svc.restore(backup);
    });
  }

  toggleFav(id: string, e: Event): void {
    if (this.isViewOnly) return;
    e.stopPropagation();
    this.svc.toggleFavorite(id);
  }

  goBack(): void { this.svc.select(null); this.view = 'list'; }

  // ── Editor events ──────────────────────────────────────
  onTitleChange(v: string): void {
    if (!this.selected || this.isViewOnly) return;
    this.svc.update(this.selected.id, { title: v });
    this.flashSave();
  }

  onContentInput(e: Event): void {
    if (!this.selected || this.isViewOnly) return;
    const html = (e.target as HTMLDivElement).innerHTML;
    this.svc.update(this.selected.id, { content: html });
    this.flashSave();
    this.detectAtSyntax(html);
  }

  execFormat(btn: FormatButton, e: MouseEvent): void {
    if (this.isViewOnly) return;
    e.preventDefault();
    document.execCommand(btn.command, false, btn.value);
    this.editorRef?.nativeElement.focus();
    if (this.selected)
      this.svc.update(this.selected.id, { content: this.editorRef.nativeElement.innerHTML });
  }

  // ── @ shortcut detection ───────────────────────────────
  private detectAtSyntax(html: string): void {
    const plain = html.replace(/<[^>]*>/g, '\n');
    const lines  = plain.split('\n').map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
      if (!line.startsWith('@')) continue;
      if (this.dismissedLines.has(line)) continue;
      if (html.includes('tx-chip')) {
        const chipName = line.slice(1).split(',')[0].trim();
        if (html.includes(chipName)) continue;
      }

      const inner = line.slice(1);
      const parts = inner.split(',').map(p => p.trim());
      if (parts.length < 5) continue;

      const [name, date, priceStr, tag, typeRaw] = parts;
      const amount = parseFloat(priceStr.replace(',', '.'));
      const type: 'income' | 'expense' =
        typeRaw.toLowerCase().includes('expense') ? 'expense' : 'income';

      if (!name || isNaN(amount)) continue;

      this.atPreview = { name, date, amount, tag, type, rawLine: line };
      this.cdr.markForCheck();
      return;
    }

    if (this.atPreview && !lines.some(l => l === this.atPreview!.rawLine)) {
      this.atPreview = null;
      this.cdr.markForCheck();
    }
  }

  // ── @ shortcut confirm ─────────────────────────────────
  confirmAtTransaction(): void {
    if (!this.atPreview || !this.selected || this.isViewOnly) return;
    const { name, date, amount, tag, type, rawLine } = this.atPreview;

    let displayDate = date;
    if (date.includes('-')) {
      const [y, m, d] = date.split('-');
      displayDate = `${d}.${m}.${y}`;
    }

    this.txSvc.addTransaction({
      id:     Date.now(),
      name,
      date:   displayDate,
      amount,
      tags:   tag ? [tag] : [],
      type,
    });

    const emoji = type === 'income' ? '✓' : '✗';
    const chipClass = type === 'expense' ? 'tx-chip expense' : 'tx-chip';
    const chip = `<span class="${chipClass}" contenteditable="false">`
      + `${emoji} ${name} · ${amount}€ · ${type}`
      + `</span>`;

    const editorEl = this.editorRef.nativeElement;
    const escaped  = rawLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    editorEl.innerHTML = editorEl.innerHTML.replace(
      new RegExp(`(<[^>]*>)?${escaped}(<[^>]*>)?`),
      chip,
    );

    this.svc.update(this.selected.id, { content: editorEl.innerHTML });
    this.atPreview = null;
    this.cdr.markForCheck();

    this.snackBar.open(
      `"${name}" added to ${type === 'income' ? 'Income' : 'Expenses'}!`,
      '',
      { duration: 3000, panelClass: ['snack-delete'] },
    );
  }

  // ── @ shortcut dismiss ─────────────────────────────────
  dismissAt(): void {
    if (this.atPreview) {
      this.dismissedLines.add(this.atPreview.rawLine);
      this.atPreview = null;
      this.cdr.markForCheck();
    }
  }

  // ── Export ─────────────────────────────────────────────
  exportNote(fmt: 'pdf' | 'txt'): void {
    if (this.selected) this.svc.export(this.selected, fmt);
  }

  // ── Filters ────────────────────────────────────────────
  onSearch(q: string): void     { this.svc.setFilter({ searchQuery: q }); }
  onSortChange(v: string): void { this.svc.setFilter({ sortField: v as any }); }

  // ── Computed ───────────────────────────────────────────
  get wordCount(): number {
    return this.selected
      ? this.selected.content
          .replace(/<[^>]*>/g, ' ')
          .trim()
          .split(/\s+/)
          .filter(Boolean).length
      : 0;
  }

  relativeDate(d: Date): string {
    const diff = Date.now() - new Date(d).getTime();
    const m    = Math.floor(diff / 60000);
    if (m < 1)  return 'Just now';
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hr ago`;
    const days = Math.floor(h / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7)   return `${days} days ago`;
    return new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  trackById(_: number, n: Note): string { return n.id; }

  // ── Private helpers ────────────────────────────────────
  private syncEditor(): void {
    if (this.editorRef && this.selected)
      this.editorRef.nativeElement.innerHTML = this.selected.content;
  }

  private flashSave(): void {
    this.autoSaved = true;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.autoSaved = false;
      this.cdr.markForCheck();
    }, 2000);
  }
}