import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';

export interface SavingsGoal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  autoSave: boolean;
  monthlyRate?: number;
  targetDate?: string;
  colorClass: string;
  deposits: { date: string; amount: number }[];
}

interface FormErrors {
  name?: string;
  targetAmount?: string;
  monthlyRate?: string;
}

type View = 'list' | 'detail' | 'form';

// ── Layout constants ──
const CARD_H   = 160;   // height of each stacked card (px)
const PEEK     = 90;    // how many px each card peeks above the one behind it
const SLOT_H   = 200;   // display slot card height
const SLOT_PAD = 18+14; // top + bottom padding of display-slot section
const DIV_H    = 1;     // divider
const STACK_BOTTOM_PAD = 16; // breathing room below bottom card

const COLORS = ['color-violet','color-emerald','color-rose','color-amber','color-sky','color-pink'];

@Component({
  selector: 'app-sparziele',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sparziele.html',
  styleUrl: './sparziele.css',
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate('350ms ease', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(24px)' }),
        animate('300ms ease', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('slideInLeft', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate('300ms ease', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
  ]
})
export class Sparziele {

  view: View = 'list';
  openId: string | null = null;
  selectedGoal: SavingsGoal | null = null;
  editingGoal: SavingsGoal | null = null;
  showDepositForm = false;
  depositAmount = '';
  form = this.emptyForm();
  formErrors: FormErrors = {};
  colorOptions = COLORS.map(cls => ({ cls }));

  goals: SavingsGoal[] = [
    {
      id: '1', name: 'Notgroschen', description: '3 Monatsgehälter als Reserve',
      targetAmount: 10000, currentAmount: 4200, autoSave: true, monthlyRate: 300,
      targetDate: '2026-07-01', colorClass: 'color-violet',
      deposits: [
        { date: '2026-02-01', amount: 300 },
        { date: '2026-01-01', amount: 300 },
        { date: '2025-12-01', amount: 300 },
      ]
    },
    {
      id: '2', name: 'Neues Auto',
      targetAmount: 15000, currentAmount: 3000, autoSave: false,
      colorClass: 'color-rose', deposits: []
    },
    {
      id: '3', name: 'Urlaub',
      targetAmount: 2500, currentAmount: 900, autoSave: true, monthlyRate: 150,
      colorClass: 'color-sky', deposits: [{ date: '2026-02-01', amount: 150 }]
    }
  ];

  // ══════════════════════════════════════
  // HEIGHT CALCULATIONS
  // ══════════════════════════════════════

  /**
   * Stack area height = enough so all cards peek out.
   * Cards are positioned from bottom=0.
   * Top of front card (index 0) = (n-1)*PEEK + CARD_H
   * Add padding at top so top card isn't flush with divider.
   */
  get stackAreaHeight(): string {
    const n = this.goals.length;
    if (n === 0) return '0px';
    const h = CARD_H + (n - 1) * PEEK + STACK_BOTTOM_PAD + 12;
    return h + 'px';
  }

  /**
   * Total holder height = display slot section + divider + stack area
   */
  get holderHeight(): string {
    const slotSection = SLOT_H + SLOT_PAD;
    const stackH = this.goals.length === 0 ? 0 : parseInt(this.stackAreaHeight, 10);
    const divider = this.goals.length > 0 ? DIV_H + 1 : 0;
    return (slotSection + divider + stackH) + 'px';
  }

  // ══════════════════════════════════════
  // STACK POSITIONING
  // Cards stack from bottom, front card is highest.
  // index 0 = front (top of visual stack)
  // index n-1 = back (bottom of visual stack, at bottom:0)
  // ══════════════════════════════════════

  getStackBottom(index: number): string {
    const n = this.goals.length;
    // Back card (index n-1) sits at STACK_BOTTOM_PAD from bottom
    // Front card (index 0) sits highest
    const pos = STACK_BOTTOM_PAD + (n - 1 - index) * PEEK;
    return pos + 'px';
  }

  getZIndex(index: number): number {
    // Front card (index 0) gets highest z
    return 50 + (this.goals.length - 1 - index) * 10;
  }

  // ══════════════════════════════════════
  // TOGGLE
  // ══════════════════════════════════════
  toggleCard(goal: SavingsGoal): void {
    if (this.openId === goal.id) {
      this.openId = null;
      this.selectedGoal = null;
      this.view = 'list';
      this.showDepositForm = false;
      this.depositAmount = '';
    } else {
      this.openId = goal.id;
      this.selectedGoal = goal;
      this.view = 'detail';
      this.showDepositForm = false;
      this.depositAmount = '';
    }
  }

  // ══════════════════════════════════════
  // NAVIGATION
  // ══════════════════════════════════════
  goToList() {
    this.view = 'list';
    this.openId = null;
    this.selectedGoal = null;
    this.editingGoal = null;
    this.showDepositForm = false;
    this.depositAmount = '';
    this.form = this.emptyForm();
    this.formErrors = {};
  }

  goToCreate() {
    this.editingGoal = null;
    this.form = this.emptyForm();
    this.formErrors = {};
    this.view = 'form';
  }

  goToEdit(goal: SavingsGoal, event: MouseEvent) {
    event.stopPropagation();
    this.editingGoal = goal;
    this.form = {
      name: goal.name, description: goal.description || '',
      targetAmount: goal.targetAmount.toString(), autoSave: goal.autoSave,
      monthlyRate: goal.monthlyRate?.toString() || '',
      targetDate: goal.targetDate || '', colorClass: goal.colorClass,
    };
    this.formErrors = {};
    this.view = 'form';
  }

  // ══════════════════════════════════════
  // COMPUTED
  // ══════════════════════════════════════
  get detailProgress(): number {
    if (!this.selectedGoal) return 0;
    return Math.min((this.selectedGoal.currentAmount / this.selectedGoal.targetAmount) * 100, 100);
  }

  get remaining(): number {
    if (!this.selectedGoal) return 0;
    return Math.max(this.selectedGoal.targetAmount - this.selectedGoal.currentAmount, 0);
  }

  get sortedDeposits() {
    if (!this.selectedGoal) return [];
    return [...this.selectedGoal.deposits].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  // ══════════════════════════════════════
  // DEPOSIT
  // ══════════════════════════════════════
  submitDeposit() {
    const amount = parseFloat(this.depositAmount);
    if (!this.selectedGoal || isNaN(amount) || amount <= 0) return;
    this.selectedGoal.currentAmount += amount;
    this.selectedGoal.deposits.push({ date: new Date().toISOString().split('T')[0], amount });
    this.depositAmount = '';
    this.showDepositForm = false;
  }

  deleteGoal(id: string, event: MouseEvent) {
    event.stopPropagation();
    this.goals = this.goals.filter(g => g.id !== id);
    if (this.openId === id) this.goToList();
  }

  // ══════════════════════════════════════
  // FORM
  // ══════════════════════════════════════
  emptyForm() {
    return { name: '', description: '', targetAmount: '', autoSave: false, monthlyRate: '', targetDate: '', colorClass: COLORS[0] };
  }

  recalcDate() {
    if (!this.form.autoSave || !this.form.targetAmount || !this.form.monthlyRate) { this.form.targetDate = ''; return; }
    const target = parseFloat(this.form.targetAmount);
    const rate = parseFloat(this.form.monthlyRate);
    const current = this.editingGoal?.currentAmount || 0;
    if (rate > 0 && target > current) {
      const months = Math.ceil((target - current) / rate);
      const d = new Date(); d.setMonth(d.getMonth() + months);
      this.form.targetDate = d.toISOString().split('T')[0];
    }
  }

  submitForm() {
    this.formErrors = {};
    if (!this.form.name.trim()) this.formErrors.name = 'Name ist ein Pflichtfeld';
    if (!this.form.targetAmount || parseFloat(this.form.targetAmount) <= 0) this.formErrors.targetAmount = 'Zielbetrag muss größer als 0 sein';
    if (this.form.autoSave && (!this.form.monthlyRate || parseFloat(this.form.monthlyRate) <= 0)) this.formErrors.monthlyRate = 'Sparrate muss größer als 0 sein';
    if (Object.keys(this.formErrors).length > 0) return;

    if (this.editingGoal) {
      const idx = this.goals.findIndex(g => g.id === this.editingGoal!.id);
      if (idx !== -1) {
        this.goals[idx] = {
          ...this.goals[idx],
          name: this.form.name.trim(),
          description: this.form.description.trim() || undefined,
          targetAmount: parseFloat(this.form.targetAmount),
          autoSave: this.form.autoSave,
          monthlyRate: this.form.autoSave ? parseFloat(this.form.monthlyRate) : undefined,
          targetDate: this.form.targetDate || undefined,
          colorClass: this.form.colorClass,
        };
      }
    } else {
      this.goals.push({
        id: Date.now().toString(),
        name: this.form.name.trim(),
        description: this.form.description.trim() || undefined,
        targetAmount: parseFloat(this.form.targetAmount),
        currentAmount: 0, autoSave: this.form.autoSave,
        monthlyRate: this.form.autoSave ? parseFloat(this.form.monthlyRate) : undefined,
        targetDate: this.form.targetDate || undefined,
        colorClass: this.form.colorClass || COLORS[this.goals.length % COLORS.length],
        deposits: [],
      });
    }
    this.goToList();
  }

  // ══════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════
  getProgress(goal: SavingsGoal): number {
    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  }

  formatCurrency(v: number): string {
    return v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
  }

  formatDate(s: string): string {
    return new Date(s).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  formatShortDate(s: string): string {
    return new Date(s).toLocaleDateString('de-DE', { year: 'numeric', month: 'short', day: 'numeric' });
  }
getWaveRise(goal: SavingsGoal): number {
  const progress = this.getProgress(goal); // 0–100
  const cardHeight = 190; // matches .slot-card height in px
  return -(progress / 100) * (cardHeight + 8);
}
  
}