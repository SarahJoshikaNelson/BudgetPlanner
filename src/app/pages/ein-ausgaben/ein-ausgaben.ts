import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';

interface Transaction {
  id: number;
  name: string;
  date: string;
  amount: number;
  tags: string[];
  type: 'income' | 'expense';
}

interface TagDef {
  name: string;
  color: string;
}

@Component({
  selector: 'app-ein-ausgaben',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ein-ausgaben.html',
  styleUrl: './ein-ausgaben.css',
  animations: [
    trigger('contentSwitch', [
      transition('* => *', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('220ms ease', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class EinAusgaben {
  activeTab: 'income' | 'expense' = 'income';
  searchQuery = '';
  selectedTags: string[] = [];
  showModal = false;
  editingId: number | null = null;
  animKey = 0;

  currentYear = 2026;
  currentMonth = 4;
  monthNames = ['Januar','Februar','März','April','Mai','Juni',
                'Juli','August','September','Oktober','November','Dezember'];

  newName = '';
  newDate = new Date().toISOString().split('T')[0];
  newAmount: number | null = null;
  newTags: string[] = [];
  customTag = '';
  selectedCustomColor = '';

  // FIX 1: more colors
  allColors = [
    { key: 'tag-green',   label: 'Grün' },
    { key: 'tag-blue',    label: 'Blau' },
    { key: 'tag-yellow',  label: 'Gelb' },
    { key: 'tag-pink',    label: 'Pink' },
    { key: 'tag-purple',  label: 'Lila' },
    { key: 'tag-orange',  label: 'Orange' },
    { key: 'tag-teal',    label: 'Türkis' },
    { key: 'tag-red',     label: 'Rot' },
    { key: 'tag-gray',    label: 'Grau' },
    { key: 'tag-indigo',  label: 'Indigo' },
    { key: 'tag-rose',    label: 'Rose' },
    { key: 'tag-lime',    label: 'Limette' },
    { key: 'tag-sky',     label: 'Himmelblau' },
    { key: 'tag-amber',   label: 'Amber' },
    { key: 'tag-cyan',    label: 'Cyan' },
  ];

  incomeTagDefs: TagDef[] = [
    { name: 'Arbeit',    color: 'tag-green' },
    { name: 'Bank',      color: 'tag-gray' },
    { name: 'Extra',     color: 'tag-blue' },
    { name: 'Verkauf',   color: 'tag-yellow' },
    { name: 'Essen',     color: 'tag-red' },
    { name: 'Transport', color: 'tag-sky' },
    { name: 'Kleidung',  color: 'tag-pink' },
  ];

  expenseTagDefs: TagDef[] = [
    { name: 'Shopping',      color: 'tag-pink' },
    { name: 'Geschenke',     color: 'tag-purple' },
    { name: 'Entertainment', color: 'tag-indigo' },
    { name: 'Wohnung',       color: 'tag-orange' },
    { name: 'Gesundheit',    color: 'tag-teal' },
    { name: 'Verkauf',       color: 'tag-yellow' },
    { name: 'Bank',          color: 'tag-gray' },
    { name: 'Extra',         color: 'tag-blue' },
    { name: 'Essen',         color: 'tag-red' },
    { name: 'Transport',     color: 'tag-sky' },
    { name: 'Kleidung',      color: 'tag-rose' },
  ];

  // FIX 2: single global tag color map — updated whenever tags added
  private tagColorMap: Record<string, string> = {};

  constructor() {
    this.rebuildColorMap();
  }

  rebuildColorMap() {
    this.tagColorMap = {};
    [...this.incomeTagDefs, ...this.expenseTagDefs].forEach(d => {
      this.tagColorMap[d.name] = d.color;
    });
  }

  transactions: Transaction[] = [
    { id: 1,  name: 'Gehalt',           date: '15.05.2026', amount: 3500,   tags: ['Arbeit'],               type: 'income' },
    { id: 2,  name: 'Freelance Projekt', date: '10.05.2026', amount: 1200,   tags: ['Arbeit','Extra'],        type: 'income' },
    { id: 3,  name: 'Verkauf Laptop',    date: '05.05.2026', amount: 450,    tags: ['Verkauf'],               type: 'income' },
    { id: 4,  name: 'Zinsen',            date: '01.05.2026', amount: 25.50,  tags: ['Bank'],                  type: 'income' },
    { id: 5,  name: 'Miete',             date: '01.05.2026', amount: 1200,   tags: ['Wohnung'],               type: 'expense' },
    { id: 6,  name: 'Lebensmittel',      date: '12.05.2026', amount: 320.50, tags: ['Shopping'],              type: 'expense' },
    { id: 7,  name: 'Strom & Gas',       date: '05.05.2026', amount: 150,    tags: ['Wohnung'],               type: 'expense' },
    { id: 8,  name: 'Netflix',           date: '15.05.2026', amount: 15.99,  tags: ['Entertainment'],         type: 'expense' },
    { id: 9,  name: 'Fitnessstudio',     date: '01.05.2026', amount: 49,     tags: ['Gesundheit'],            type: 'expense' },
    { id: 10, name: 'Geschenk Mama',     date: '08.05.2026', amount: 80,     tags: ['Geschenke'],             type: 'expense' },
    { id: 11, name: 'Gehalt',            date: '15.04.2026', amount: 3500,   tags: ['Arbeit'],                type: 'income' },
    { id: 12, name: 'Miete April',       date: '01.04.2026', amount: 1200,   tags: ['Wohnung'],               type: 'expense' },
  ];

  get currentTagDefs(): TagDef[] {
    return this.activeTab === 'income' ? this.incomeTagDefs : this.expenseTagDefs;
  }

  get availableTags(): string[] {
    return this.currentTagDefs.map(t => t.name);
  }

  get usedColors(): string[] {
    return this.currentTagDefs.map(t => t.color);
  }

  get availableColors() {
    return this.allColors.filter(c => !this.usedColors.includes(c.key));
  }

  get filteredTransactions(): Transaction[] {
    const mm = String(this.currentMonth + 1).padStart(2, '0');
    const yy = String(this.currentYear);
    return this.transactions.filter(t => {
      if (t.type !== this.activeTab) return false;
      const parts = t.date.split('.');
      if (parts.length === 3 && (parts[1] !== mm || parts[2] !== yy)) return false;
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const match =
          t.name.toLowerCase().includes(q) ||
          t.date.includes(q) ||
          t.amount.toString().includes(q) ||
          t.tags.some(tag => tag.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (this.selectedTags.length > 0) {
        if (!this.selectedTags.some(tag => t.tags.includes(tag))) return false;
      }
      return true;
    });
  }

  get currentMonthLabel(): string {
    return `${this.monthNames[this.currentMonth]} ${this.currentYear}`;
  }

  prevMonth() {
    if (this.currentMonth === 0) { this.currentMonth = 11; this.currentYear--; }
    else this.currentMonth--;
    this.animKey++;
    this.selectedTags = [];
  }

  nextMonth() {
    if (this.currentMonth === 11) { this.currentMonth = 0; this.currentYear++; }
    else this.currentMonth++;
    this.animKey++;
    this.selectedTags = [];
  }

  switchTab(tab: 'income' | 'expense') {
    this.activeTab = tab;
    this.selectedTags = [];
    this.animKey++;
  }

  toggleTag(tag: string) {
    this.selectedTags = this.selectedTags.includes(tag)
      ? this.selectedTags.filter(t => t !== tag)
      : [...this.selectedTags, tag];
  }

  clearFilters() { this.selectedTags = []; }

  toggleNewTag(tag: string) {
    this.newTags = this.newTags.includes(tag)
      ? this.newTags.filter(t => t !== tag)
      : [...this.newTags, tag];
  }

  addCustomTag() {
    const tag = this.customTag.trim();
    if (!tag || !this.selectedCustomColor) return;
    if (this.activeTab === 'income') {
      if (!this.incomeTagDefs.find(d => d.name === tag)) {
        this.incomeTagDefs = [...this.incomeTagDefs, { name: tag, color: this.selectedCustomColor }];
      }
    } else {
      if (!this.expenseTagDefs.find(d => d.name === tag)) {
        this.expenseTagDefs = [...this.expenseTagDefs, { name: tag, color: this.selectedCustomColor }];
      }
    }
    if (!this.newTags.includes(tag)) this.newTags = [...this.newTags, tag];
    this.rebuildColorMap(); // FIX 2: update map immediately
    this.customTag = '';
    this.selectedCustomColor = '';
  }

  openModal() {
    this.editingId = null;
    this.newName = '';
    this.newDate = new Date().toISOString().split('T')[0];
    this.newAmount = null;
    this.newTags = [];
    this.customTag = '';
    this.selectedCustomColor = '';
    this.showModal = true;
  }

  openEdit(t: Transaction) {
    this.editingId = t.id;
    this.newName = t.name;
    const parts = t.date.split('.');
    this.newDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : t.date;
    this.newAmount = t.amount;
    this.newTags = [...t.tags];
    this.customTag = '';
    this.selectedCustomColor = '';
    this.showModal = true;
  }

  closeModal() { this.showModal = false; this.editingId = null; }

  saveTransaction() {
    if (!this.newName || !this.newAmount) return;
    if (this.editingId !== null) {
      this.transactions = this.transactions.map(t =>
        t.id === this.editingId
          ? { ...t, name: this.newName, date: this.formatDate(this.newDate), amount: this.newAmount!, tags: [...this.newTags] }
          : t
      );
    } else {
      this.transactions = [{
        id: Date.now(),
        name: this.newName,
        date: this.formatDate(this.newDate),
        amount: this.newAmount,
        tags: [...this.newTags],
        type: this.activeTab,
      }, ...this.transactions];
    }
    this.rebuildColorMap(); // FIX 2: ensure colors always up to date
    this.animKey++;
    this.closeModal();
  }

  deleteTransaction(id: number) {
    this.transactions = this.transactions.filter(t => t.id !== id);
    this.animKey++;
  }

  formatDate(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }

  // FIX 2: use map instead of searching defs
  getTagColor(tagName: string): string {
    return this.tagColorMap[tagName] || 'tag-gray';
  }
}