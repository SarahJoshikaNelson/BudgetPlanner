import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FinancialEntry } from '../models/financeModel';
import { AuthService } from './auth.service';

interface TransactionRow {
  id: number;
  name: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
}

@Injectable({
  providedIn: 'root',
})
export class FinanceService {
  private http = inject(HttpClient);
  private readonly API_URL = '/api/budget';

  private _entries = signal<FinancialEntry[]>([]);
  entries = computed(() => this._entries());

  constructor() {
    if (inject(AuthService).checkLoggedIn()) {
      this.loadEntries();
    }
  }

  loadEntries() {
    console.log('loadEntries called');
    this.http.get<TransactionRow[]>(`${this.API_URL}/transactions`).subscribe({
      next: (rows) => {
        this._entries.set(rows.map((row) => this.mapRow(row)));
      },
      error: (err) => console.error('Fehler:', err),
    });
  }

  private mapRow(row: TransactionRow): FinancialEntry {
    return {
      id: String(row.id),
      amount: row.amount,
      type: row.type,
      category: row.category ?? '',
      date: new Date(row.date),
    };
  }
}
