import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CsvRow } from '../../../models/transactionModel';

@Component({
  selector: 'app-csv-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './csv-upload.html',
  styleUrl: './csv-upload.css'
})
export class CsvUpload {
  @Output() imported = new EventEmitter<CsvRow[]>();

  isDragging = false;
  showHelp = false; // Steuert die (i)-Box
  rows: CsvRow[] = [];

  // ── Drag & Drop ────────────────────────────────────────
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.readFile(files[0]);
    }
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.readFile(input.files[0]);
    }
  }

  // ── File Logic ─────────────────────────────────────────
  private readFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      this.rows = this.parseCsv(text);
    };
    reader.readAsText(file);
  }

private parseCsv(text: string): CsvRow[] {
  const lines = text.split('\n');
  const result: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Supports both semicolons and commas
    const cols = line.split(/[,;]/);
    if (cols.length >= 4) {
      const rawDate = cols[1].trim();

      // Automatically convert yyyy-MM-dd to dd.MM.yyyy
      let date = rawDate;
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        const [y, m, d] = rawDate.split('-');
        date = `${d}.${m}.${y}`;
      }

      const rawTag = cols[3]?.trim();

      result.push({
        name: cols[0].trim(),
        date: date,
        amount: cols[2].trim(),
        // Index 3 is the Tag column
        tag: rawTag === '' || !rawTag ? 'notag' : rawTag,
        // Index 4 is the actual Type column
        type: cols[4]?.trim().toLowerCase() as 'income' | 'expense' || 'expense'
      });
    }
  }
  return result;
}
  // ── Actions ────────────────────────────────────────────
  importAll() {
    if (this.rows.length > 0) {
      this.imported.emit(this.rows);
      this.clear();
    }
  }

  clear() {
    this.rows = [];
  }
}