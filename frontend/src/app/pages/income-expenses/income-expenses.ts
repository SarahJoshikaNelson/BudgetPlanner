import { Component, inject, signal, computed, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { CsvUpload } from './csv-upload/csv-upload';
import { Transaction, TagDef, CsvRow } from '../../models/transactionModel';
import { TransactionService } from '../../services/transactionService';
import { AuthService } from '../../services/auth.service';
import { WorkspaceService } from '../../services/workspace.service';
import { environment } from '../../../environments/environment';


@Component({
  selector: 'app-income-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule, CsvUpload],
  templateUrl: './income-expenses.html',
  styleUrl: './income-expenses.css',
  animations: [
    trigger('contentSwitch', [
      transition('* => *', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('200ms ease', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class IncomeExpenses implements OnInit {

  // ── Services ───────────────────────────────────────────
  private transactionService = inject(TransactionService);
  private authService        = inject(AuthService);
private workspaceService = inject(WorkspaceService);

readonly isViewOnly = computed(() => {
  const p = this.workspaceService.activePermissions();
  if (!p) return false;
  return p.transactions !== 'write';
});
  // ── View State ─────────────────────────────────────────
  activeTab = signal<'income' | 'expense'>('income');
  searchQuery = signal('');
  selectedTags = signal<string[]>([]);
  showModal = signal(false);
  editingId = signal<number | string | null>(null);
  animKey = signal(0);
  bankLinking = signal(false);
  bankError   = signal<string | null>(null);
  bankSyncing = signal(false);
  bankConnected = signal(false);

  // ── Monatsnavigation ───────────────────────────────────
  currentYear = signal(new Date().getFullYear());
  currentMonth = signal(new Date().getMonth());
  readonly monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  // ── Modal Felder ───────────────────────────────────────
  newName = '';
  newDate = new Date().toISOString().split('T')[0];
  newAmount: number | null = null;
  newTags: string[] = [];
  customTag = '';
  selectedCustomColor = 'tag-gray';

  // ── Tag Definitionen ───────────────────────────────────
  incomeTagDefs = signal<TagDef[]>([
    { name: 'Arbeit',      color: 'tag-green'  },
    { name: 'Bank',        color: 'tag-gray'   },
    { name: 'Extra',       color: 'tag-blue'   },
    { name: 'Verkauf',     color: 'tag-yellow' },
    { name: 'Essen',       color: 'tag-red'    },
    { name: 'Toll',        color: 'tag-sky'    },
    { name: 'LebenIsHart', color: 'tag-pink'   },
  ]);

  expenseTagDefs = signal<TagDef[]>([
    { name: 'Shopping',      color: 'tag-pink'   },
    { name: 'Geschenke',     color: 'tag-purple' },
    { name: 'Entertainment', color: 'tag-indigo' },
    { name: 'Wohnung',       color: 'tag-orange' },
    { name: 'Gesundheit',    color: 'tag-teal'   },
    { name: 'Essen',         color: 'tag-red'    },
    { name: 'Transport',     color: 'tag-sky'    },
  ]);

  readonly allColors = [
    { key: 'tag-green',  label: 'Grün'   },
    { key: 'tag-blue',   label: 'Blau'   },
    { key: 'tag-yellow', label: 'Gelb'   },
    { key: 'tag-pink',   label: 'Pink'   },
    { key: 'tag-purple', label: 'Lila'   },
    { key: 'tag-orange', label: 'Orange' },
    { key: 'tag-teal',   label: 'Türkis' },
    { key: 'tag-red',    label: 'Rot'    },
  ];

  // ── Computed ───────────────────────────────────────────
  filteredTransactions = computed(() => {
    const all = this.transactionService.transactions();
    const mm = String(this.currentMonth() + 1).padStart(2, '0');
    const yy = String(this.currentYear());
    const q = this.searchQuery().toLowerCase();
    const tags = this.selectedTags();
    const tab = this.activeTab();

    return all.filter(t => {
      if (!t.date || !t.date.includes('.')) return false;
      const [, tMonth, tYear] = t.date.split('.');
      const matchesMonth = tMonth === mm && tYear === yy;
      const matchesTab   = t.type === tab;
      const matchesQuery = !q || t.name.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q));
      const matchesTags  = tags.length === 0 || tags.some(tag => t.tags.includes(tag));
      return matchesMonth && matchesTab && matchesQuery && matchesTags;
    }).sort((a, b) => {
      const dateA = a.date.split('.').reverse().join('');
      const dateB = b.date.split('.').reverse().join('');
      return dateB.localeCompare(dateA);
    });
  });

  currentTagDefs = computed(() =>
    this.activeTab() === 'income' ? this.incomeTagDefs() : this.expenseTagDefs()
  );

  currentMonthLabel = computed(() =>
    `${this.monthNames[this.currentMonth()]} ${this.currentYear()}`
  );

  

  totalIncome   = computed(() => this.calcSum('income'));
  totalExpenses = computed(() => this.calcSum('expense'));
  netBalance    = computed(() => this.totalIncome() - this.totalExpenses());

  constructor() {
    effect(() => {
      const allTransactions = this.transactionService.transactions();
      allTransactions.forEach(t => {
        t.tags.forEach(tagName => {
          if (t.type === 'income') {
            this.incomeTagDefs.update(prev => {
              if (prev.some(item => item.name.toLowerCase() === tagName.toLowerCase())) return prev;
              return [...prev, { name: tagName, color: 'tag-blue' }];
            });
          } else {
            this.expenseTagDefs.update(prev => {
              if (prev.some(item => item.name.toLowerCase() === tagName.toLowerCase())) return prev;
              return [...prev, { name: tagName, color: 'tag-pink' }];
            });
          }
        });
      });
    }, { allowSignalWrites: true });
  }

  private calcSum(type: 'income' | 'expense'): number {
    const mm = String(this.currentMonth() + 1).padStart(2, '0');
    const yy = String(this.currentYear());
    return this.transactionService.transactions()
      .filter(t => {
        if (!t.date || !t.date.includes('.')) return false;
        return t.type === type &&
          t.date.split('.')[1] === mm &&
          t.date.split('.')[2] === yy;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }

  // ── Lifecycle ──────────────────────────────────────────
async ngOnInit() {
  // 1. Load regular local transactions
  this.transactionService.loadTransactions();

  // 2. Check if we just bounced back from Tink to complete a fresh sync
  if (localStorage.getItem('bankLinkToken')) {
    this.syncBank();
    return;
  }

  // 3. ✅ Check persistent bank connection status via the backend API
  try {
    let token = this.authService.getToken() || '';
    if (token.startsWith('Bearer ')) token = token.slice(7);

    if (token) {
      const response = await fetch(`${environment.apiUrl}/api/bank/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Sets the signal to true if an entry exists in Supabase
        this.bankConnected.set(!!data.connected);
      } else {
        this.bankConnected.set(false);
      }
    }
  } catch (err) {
    console.error('Failed to look up true database bank connection status:', err);
    this.bankConnected.set(false);
  }
}

  // ── Tab / Navigation ───────────────────────────────────
  switchTab(tab: 'income' | 'expense') {
    this.activeTab.set(tab);
    this.selectedTags.set([]);
    this.animKey.update(v => v + 1);
  }

  prevMonth() {
    if (this.currentMonth() === 0) {
      this.currentMonth.set(11);
      this.currentYear.update(y => y - 1);
    } else {
      this.currentMonth.update(m => m - 1);
    }
    this.animKey.update(v => v + 1);
  }

  nextMonth() {
    if (this.currentMonth() === 11) {
      this.currentMonth.set(0);
      this.currentYear.update(y => y + 1);
    } else {
      this.currentMonth.update(m => m + 1);
    }
    this.animKey.update(v => v + 1);
  }

  // ── Tags ───────────────────────────────────────────────
  toggleTag(tag: string) {
    this.selectedTags.update(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }

  getTagColor(tagName: string): string {
    const allTags = [...this.incomeTagDefs(), ...this.expenseTagDefs()];
    return allTags.find(t => t.name === tagName)?.color || 'tag-gray';
  }

  addCustomTag() {
    const tag = this.customTag.trim();
    if (!tag || !this.selectedCustomColor) return;
    const newTagDef: TagDef = { name: tag, color: this.selectedCustomColor };
    
    if (this.activeTab() === 'income') {
      this.incomeTagDefs.update(prev => {
        if (prev.some(t => t.name.toLowerCase() === tag.toLowerCase())) return prev;
        return [...prev, newTagDef];
      });
    } else {
      this.expenseTagDefs.update(prev => {
        if (prev.some(t => t.name.toLowerCase() === tag.toLowerCase())) return prev;
        return [...prev, newTagDef];
      });
    }
    
    if (!this.newTags.includes(tag)) {
      this.newTags = [...this.newTags, tag];
    }
    this.customTag = '';
  }

  toggleNewTag(tagName: string) {
    if (this.newTags.includes(tagName)) {
      this.newTags = this.newTags.filter(t => t !== tagName);
    } else {
      this.newTags = [...this.newTags, tagName];
    }
  }

  // ── Modal ──────────────────────────────────────────────
  openModal() {
    this.editingId.set(null);
    this.newName = '';
    this.newDate = new Date().toISOString().split('T')[0];
    this.newAmount = null;
    this.newTags = [];
    this.showModal.set(true);
  }

  openEdit(t: Transaction) {
    this.editingId.set(t.id);
    this.newName = t.name;
    const [d, m, y] = t.date.split('.');
    this.newDate = `${y}-${m}-${d}`;
    this.newAmount = t.amount;
    this.newTags = [...t.tags];
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  // ── Bank Connection ────────────────────────────────────
  async connectBank() {
    this.bankLinking.set(true);
    this.bankError.set(null);
    try {
      let token = this.authService.getToken() || '';
      if (token.startsWith('Bearer ')) token = token.slice(7);

      if (!token) {
        this.bankError.set('You must be logged in to connect your bank.');
        return;
      }

      localStorage.setItem('bankLinkToken', token);

      const response = await fetch(`${environment.apiUrl}/api/bank/initiate-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const data = await response.json();

      if (data.tinkUrl) {
        window.location.href = data.tinkUrl;
      } else {
        this.bankError.set('Failed to get Tink link from server.');
        localStorage.removeItem('bankLinkToken');
      }
    } catch (err: any) {
      console.error('Bank link error:', err);
      this.bankError.set('Could not connect to bank service. Try again.');
      localStorage.removeItem('bankLinkToken');
    } finally {
      this.bankLinking.set(false);
    }
  }

  async syncBank() {
    this.bankSyncing.set(true);
    this.bankError.set(null);

    let token = localStorage.getItem('bankLinkToken') || this.authService.getToken() || '';
    if (token.startsWith('Bearer ')) token = token.slice(7);

    if (!token) {
      this.bankError.set('Not logged in.');
      this.bankSyncing.set(false);
      return;
    }

    try {
      const response = await fetch(`${environment.apiUrl}/api/bank/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Sync failed');

      localStorage.removeItem('bankLinkToken');
      this.bankConnected.set(true);

      await this.transactionService.fetchTransactions();
      this.animKey.update(v => v + 1);
      console.log('✅ Bank sync complete:', data.message);

    } catch (err: any) {
      console.error('Sync error:', err);
      this.bankError.set('Sync failed: ' + err.message);
    } finally {
      this.bankSyncing.set(false);
    }
  }

  // ── Transactions ───────────────────────────────────────
  saveTransaction() {
    if (!this.newName || this.newAmount === null) {
      alert('Bitte Name und Betrag eingeben!');
      return;
    }

    const transaction: Transaction = {
      id: this.editingId() ?? Date.now(),
      name: this.newName,
      date: this.isoToDisplayDate(this.newDate),
      amount: Number(this.newAmount),
      tags: [...this.newTags],
      type: this.activeTab()
    };

    if (this.editingId() !== null) {
      this.transactionService.updateTransaction(transaction);
    } else {
      this.transactionService.addTransaction(transaction);
    }

    this.closeModal();
  }

  deleteTransaction(id: number | string) {
    this.transactionService.deleteTransaction(id);
    this.animKey.update(v => v + 1);
  }

  // ── Saubere CSV-Datenübergabe mit Tags ─────────────────
  onCsvImport(rows: CsvRow[]) {
    rows.forEach(r => {
      // Komma-Beträge in JavaScript-Floats umwandeln
      const parsedAmount = r.amount ? parseFloat(r.amount.toString().replace(',', '.')) : 0;

      this.transactionService.addTransaction({
        id: Math.random().toString(36).substring(2, 9),
        name: r.name,
        date: r.date,
        amount: parsedAmount || 0,
        // Übergibt den extrahierten Tag direkt als Array oder lässt es leer bei "notag"
        tags: r.tag === 'notag' ? [] : [r.tag], 
        type: r.type
      });
    });
    this.animKey.update(v => v + 1);
  }

  private isoToDisplayDate(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }
}