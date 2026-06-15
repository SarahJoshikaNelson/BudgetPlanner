import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { Note, NoteCategory, NoteFilter } from '../models/noteModel';
import { AuthService } from './auth.service';

const API = '/api/notes';

@Injectable({ providedIn: 'root' })
export class NoteService {
  private readonly http        = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly notesSub  = new BehaviorSubject<Note[]>([]);
  private readonly filterSub = new BehaviorSubject<NoteFilter>({
    searchQuery: '',
    sortField:   'updatedAt',
    sortDir:     'desc',
  });
  private readonly selectedSub = new BehaviorSubject<Note | null>(null);
  private autoSaveHandle: ReturnType<typeof setTimeout> | null = null;

  readonly filtered$: Observable<Note[]> = combineLatest([
    this.notesSub.asObservable(),
    this.filterSub.asObservable(),
  ]).pipe(map(([n, f]) => this.applyFilter(n, f)));

  readonly filter$   = this.filterSub.asObservable();
  readonly selected$ = this.selectedSub.asObservable();

  constructor() {
    if (this.authService.checkLoggedIn()) {
      this.loadAll();
    }
  }

  public reloadNotes(): void {
    this.loadAll();
  }

  private loadAll(): void {
    this.http.get<Note[]>(API).subscribe(notes => {
      this.notesSub.next(notes.map(this.parseNote));
    });
  }

create(category: NoteCategory = 'Ideas'): void {
    const body = { id: crypto.randomUUID(), title: 'Neue Notiz', content: '', category };
    this.http.post<Note>(API, body).subscribe(note => {
      const parsed = this.parseNote(note);
      this.notesSub.next([parsed, ...this.notesSub.value]);
      this.select(parsed);
    });
  }

  select(note: Note | null): void { this.selectedSub.next(note); }

  update(id: string, changes: Partial<Pick<Note, 'title' | 'content' | 'category'>>): void {
    const list = this.notesSub.value.map(n =>
      n.id === id ? { ...n, ...changes, updatedAt: new Date() } : n
    );
    this.notesSub.next(list);
    if (this.selectedSub.value?.id === id)
      this.selectedSub.next(list.find(n => n.id === id) ?? null);

    if (this.autoSaveHandle) clearTimeout(this.autoSaveHandle);
    this.autoSaveHandle = setTimeout(() => {
      this.http.put<Note>(`${API}/${id}`, changes).subscribe(updated => {
        const synced = this.notesSub.value.map(n =>
          n.id === id ? this.parseNote(updated) : n
        );
        this.notesSub.next(synced);
        if (this.selectedSub.value?.id === id)
          this.selectedSub.next(this.parseNote(updated));
      });
    }, 800);
  }

  delete(id: string): void {
    this.http.delete(`${API}/${id}`).subscribe(() => {
      const list = this.notesSub.value.filter(n => n.id !== id);
      this.notesSub.next(list);
      if (this.selectedSub.value?.id === id) this.selectedSub.next(null);
    });
  }

  toggleFavorite(id: string): void {
    const note = this.notesSub.value.find(n => n.id === id);
    if (!note) return;
    const isFavorite = !note.isFavorite;
    this.notesSub.next(
      this.notesSub.value.map(n => n.id === id ? { ...n, isFavorite } : n)
    );
    this.http.put<Note>(`${API}/${id}`, { isFavorite }).subscribe(updated => {
      this.notesSub.next(
        this.notesSub.value.map(n => n.id === id ? this.parseNote(updated) : n)
      );
    });
  }

  setFilter(p: Partial<NoteFilter>): void {
    this.filterSub.next({ ...this.filterSub.value, ...p });
  }

  export(note: Note, fmt: 'pdf' | 'txt'): void {
    if (fmt === 'txt') {
      const blob = new Blob(
        [`${note.title}\n\n${note.content.replace(/<[^>]*>/g, '')}`],
        { type: 'text/plain' }
      );
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: `${note.title}.txt` }).click();
      URL.revokeObjectURL(url);
      return;
    }

    if (fmt === 'pdf') {
      const createdStr = new Date(note.createdAt).toLocaleDateString('de-AT', {
        day: '2-digit', month: 'long', year: 'numeric',
      });
      const updatedStr = new Date(note.updatedAt).toLocaleDateString('de-AT', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

      const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
<title>${note.title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a2e; background: #fff; }
  .page { max-width: 720px; margin: 0 auto; padding: 56px 64px; }
  .pdf-header { border-bottom: 2px solid #3b82f6; padding-bottom: 1.5rem; margin-bottom: 2rem; }
  .pdf-app-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #3b82f6; margin-bottom: 0.75rem; }
  .pdf-title { font-size: 2rem; font-weight: 800; color: #0f172a; letter-spacing: -0.03em; line-height: 1.2; margin-bottom: 0.875rem; }
  .pdf-meta { display: flex; gap: 1.5rem; flex-wrap: wrap; }
  .pdf-meta-item { display: flex; flex-direction: column; gap: 0.15rem; }
  .pdf-meta-label { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #94a3b8; }
  .pdf-meta-value { font-size: 0.82rem; color: #475569; font-weight: 500; }
  .pdf-content { font-size: 0.975rem; line-height: 1.85; color: #334155; }
  .pdf-footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; }
  .pdf-footer-left { font-size: 0.7rem; color: #94a3b8; }
  .pdf-footer-right { font-size: 0.7rem; color: #cbd5e1; }
  @media print { .page { padding: 40px 48px; } }
</style>
</head><body>
<div class="page">
  <div class="pdf-header">
    <div class="pdf-app-label">BudgetPlanner · Notizen</div>
    <div class="pdf-title">${note.title}</div>
    <div class="pdf-meta">
      <div class="pdf-meta-item">
        <span class="pdf-meta-label">Erstellt</span>
        <span class="pdf-meta-value">${createdStr}</span>
      </div>
      <div class="pdf-meta-item">
        <span class="pdf-meta-label">Zuletzt bearbeitet</span>
        <span class="pdf-meta-value">${updatedStr}</span>
      </div>
      <div class="pdf-meta-item">
        <span class="pdf-meta-label">Kategorie</span>
        <span class="pdf-meta-value">${note.category}</span>
      </div>
    </div>
  </div>
  <div class="pdf-content">${note.content}</div>
  <div class="pdf-footer">
    <span class="pdf-footer-left">${note.title}</span>
    <span class="pdf-footer-right">BudgetPlanner</span>
  </div>
</div>
<script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
</body></html>`;

      const blob = new Blob([html], { type: 'text/html' });
      const url  = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  }

  private applyFilter(notes: Note[], f: NoteFilter): Note[] {
    let r = [...notes];
    if (f.searchQuery.trim()) {
      const q = f.searchQuery.toLowerCase();
      r = r.filter(n => n.title.toLowerCase().includes(q));
    }
    r.sort((a, b) => {
      const cmp = f.sortField === 'title'
        ? a.title.localeCompare(b.title)
        : new Date(a[f.sortField]).getTime() - new Date(b[f.sortField]).getTime();
      return f.sortDir === 'asc' ? cmp : -cmp;
    });
    return [...r.filter(n => n.isFavorite), ...r.filter(n => !n.isFavorite)];
  }

  private parseNote(n: any): Note {
    return {
      ...n,
      createdAt: new Date(n.createdAt),
      updatedAt: new Date(n.updatedAt),
    };
  }

  restore(note: Note): void {
  const body = {
    id:         note.id,
    title:      note.title,
    content:    note.content,
    category:   note.category,
    isFavorite: note.isFavorite ?? false,
  };
  this.http.post<Note>(API, body).subscribe(restored => {
    const parsed = this.parseNote(restored);
    this.notesSub.next([parsed, ...this.notesSub.value]);
    this.select(parsed);
  });
}
}