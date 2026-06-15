import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Transaction } from '../models/transactionModel';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

interface TransactionRow {
  id: number;
  name: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string; // Kept for backward compatibility / Tink fallback
  tags?: string[] | string; // Handle array from DB or fallback string
  date: string;
}

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly API_URL = `${environment.apiUrl}/api/budget`;

  transactions = signal<Transaction[]>([]);
  isLoading = signal(false);
  hasError = signal(false);

  constructor() {
    this.loadTransactions();
  }

  loadTransactions() {
  console.log('loadTransactions called, user:', this.authService.getCurrentUser());
  if (!this.authService.getCurrentUser()) {
    console.log('No user found, skipping load');
    return;
  }
  this.isLoading.set(true);
  this.hasError.set(false);

  this.http
    .get<TransactionRow[]>(`${this.API_URL}/transactions`)
    .subscribe({
      next: (rows) => {
        console.log('Raw rows from API:', rows);
        this.transactions.set(rows.map(row => this.mapRow(row)));
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Fehler beim Laden:', err);
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });
  }
  
  async fetchTransactions() {
    if (!this.authService.getCurrentUser()) return;

    this.http
      .get<TransactionRow[]>(`${this.API_URL}/transactions`)
      .subscribe({
        next: (rows) => {
          this.transactions.set(rows.map(row => this.mapRow(row)));
        },
        error: (err) => console.error('Fehler beim Aktualisieren nach Bank-Sync:', err)
      });
  }

  addTransaction(t: Transaction) {
    const payload = {
      name: t.name,
      amount: t.amount,
      type: t.type,
      tags: t.tags ?? [], // Pass entire tags array to backend
      category: t.tags[0] ?? 'Bank', // Kept intact so Tink/category fallback doesn't break
      date: this.displayToIso(t.date),
    };

    this.http.post<{ id: number }>(`${this.API_URL}/transactions`, payload).subscribe({
      next: (res) => {
        this.transactions.update(all => [{ ...t, id: res.id }, ...all]);
      },
      error: (err) => console.error('Fehler beim Speichern:', err)
    });
  }

  deleteTransaction(id: number | string) {
    this.http.delete(`${this.API_URL}/transactions/${id}`).subscribe({
      next: () => {
        this.transactions.update(all => all.filter(t => t.id !== id));
      },
      error: (err) => console.error('Fehler beim Löschen:', err)
    });
  }

  updateTransaction(updated: Transaction) {
    const payload = {
      name: updated.name,
      amount: updated.amount,
      type: updated.type,
      tags: updated.tags ?? [], // Pass entire updated array to backend
      category: updated.tags[0] ?? 'Bank', // Kept intact for Tink compatibility
      date: this.displayToIso(updated.date),
    };

    this.http.put(`${this.API_URL}/transactions/${updated.id}`, payload).subscribe({
      next: () => {
        this.transactions.update(all =>
          all.map(t => t.id === updated.id ? updated : t)
        );
      },
      error: (err) => console.error('Fehler beim Aktualisieren:', err)
    });
  }

  private mapRow(row: TransactionRow): Transaction {
    let parsedTags: string[] = [];
    if (Array.isArray(row.tags)) {
      parsedTags = row.tags;
    } else if (typeof row.tags === 'string' && row.tags.trim().length > 0) {
      parsedTags = row.tags.split(',');
    } else if (row.category) {
      parsedTags = [row.category];
    }

    return {
      id: row.id,
      name: row.name,
      amount: Number(row.amount),
      type: row.type,
      tags: parsedTags,
      date: this.isoToDisplay(row.date),
    };
  }

  private isoToDisplay(iso: string): string {
    if (!iso || !iso.includes('-')) return iso;
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }

  private displayToIso(display: string): string {
    if (!display || !display.includes('.')) return display;
    const [d, m, y] = display.split('.');
    return `${y}-${m}-${d}`;
  }
}