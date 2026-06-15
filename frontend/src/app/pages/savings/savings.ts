import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { SavingsService } from '../../services/savingService';
import { SavingsGoal, FormErrors } from '../../models/savingModel';
import { FinancialTipsComponent } from "./financialTips/financialTips";
import { WorkspaceService } from '../../services/workspace.service';

type View = 'list' | 'detail' | 'form';
const COLORS = ['color-violet','color-emerald','color-rose','color-amber','color-sky','color-pink'];

@Component({
  selector: 'app-savings',
  standalone: true,
  imports: [CommonModule, FormsModule, FinancialTipsComponent],
  templateUrl: './savings.html',
  styleUrl: './savings.css',
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
export class Savings {
  private savingsService = inject(SavingsService);
  private workspaceService = inject(WorkspaceService);

readonly isViewOnly = computed(() => {
  const p = this.workspaceService.activePermissions();
  if (!p) return false;
  return p.savings !== 'write';
});

  view = signal<View>('list');
  selectedGoalId = signal<string | null>(null);
  editingGoalId = signal<string | null>(null);
  showDepositForm = signal(false);
  depositAmount = signal('');

  goals = this.savingsService.goals;

  selectedGoal = computed(() =>
    this.goals().find(g => g.id === this.selectedGoalId()) ?? null
  );

  detailProgress = computed(() => {
    const goal = this.selectedGoal();
    if (!goal) return 0;
    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  });

  remaining = computed(() => {
    const goal = this.selectedGoal();
    return goal ? Math.max(goal.targetAmount - goal.currentAmount, 0) : 0;
  });

  sortedDeposits = computed(() => {
    const goal = this.selectedGoal();
    if (!goal) return [];
    return [...goal.deposits].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  });

  form = signal({
    name: '',
    description: '',
    targetAmount: '',
    autoSave: false,
    monthlyRate: '',
    targetDate: '',
    colorClass: COLORS[0]
  });

  formErrors = signal<FormErrors>({});
  colorOptions = COLORS.map(cls => ({ cls }));

  toggleCard(goal: SavingsGoal) {
    if (this.selectedGoalId() === goal.id) {
      this.goToList();
    } else {
      this.selectedGoalId.set(goal.id);
      this.view.set('detail');
      this.showDepositForm.set(false);
    }
  }

  goToList() {
    this.view.set('list');
    this.selectedGoalId.set(null);
    this.editingGoalId.set(null);
    this.showDepositForm.set(false);
    this.depositAmount.set('');
  }

  goToCreate() {
    this.editingGoalId.set(null);
    this.form.set({
      name: '', description: '', targetAmount: '',
      autoSave: false, monthlyRate: '', targetDate: '',
      colorClass: COLORS[0]
    });
    this.formErrors.set({});
    this.view.set('form');
  }

  goToEdit(goal: SavingsGoal, event: MouseEvent) {
    event.stopPropagation();
    this.editingGoalId.set(goal.id);
    this.form.set({
      name: goal.name,
      description: goal.description || '',
      targetAmount: goal.targetAmount.toString(),
      autoSave: goal.autoSave,
      monthlyRate: goal.monthlyRate?.toString() || '',
      targetDate: goal.targetDate || '',
      colorClass: goal.colorClass
    });
    this.formErrors.set({});
    this.view.set('form');
  }

  submitDeposit() {
    const amount = parseFloat(this.depositAmount());
    const id = this.selectedGoalId();
    if (id && !isNaN(amount) && amount > 0) {
      this.savingsService.addDeposit(id, amount).subscribe(() => {
        this.savingsService.loadGoals(() => {
          setTimeout(() => {
            this.recalcAndSaveDate(id);
          }, 100)
        });
     });
     this.depositAmount.set('');
     this.showDepositForm.set(false);
    }
  }

  private recalcAndSaveDate(id: string) {
    const goal = this.goals().find(g => g.id === id);
    if (!goal || !goal.autoSave || !goal.monthlyRate){
      return;
    } 

    const remaining = goal.targetAmount - goal.currentAmount;
    if (remaining <= 0){
      return;
    } 

    const months = Math.ceil(remaining / goal.monthlyRate);
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    const newDate = d.toISOString().split('T')[0];

    this.savingsService.updateGoal({ ...goal, targetDate: newDate });
  }

  deleteGoal(id: string, event: MouseEvent) {
    event.stopPropagation();
    this.savingsService.deleteGoal(id);
    this.goToList();
  }

  submitForm() {
    const errors: FormErrors = {};
    const f = this.form();
    if (!f.name.trim()) errors['name'] = 'Name ist ein Pflichtfeld';
    if (!f.targetAmount || parseFloat(f.targetAmount) <= 0)
      errors['targetAmount'] = 'Zielbetrag muss größer als 0 sein';
    if (f.autoSave && (!f.monthlyRate || parseFloat(f.monthlyRate) <= 0))
      errors['monthlyRate'] = 'Sparrate muss größer als 0 sein';

    if (Object.keys(errors).length > 0) {
      this.formErrors.set(errors);
      return;
    }

    // WICHTIG: Bestehende Daten holen, falls wir editieren
    const existingGoal = this.editingGoalId() 
      ? this.goals().find(g => g.id === this.editingGoalId()) 
      : null;

    const goalData: SavingsGoal = {
      id: this.editingGoalId() || Date.now().toString(),
      name: f.name.trim(),
      description: f.description.trim() || undefined,
      targetAmount: parseFloat(f.targetAmount),
      currentAmount: existingGoal ? existingGoal.currentAmount : 0,
      autoSave: f.autoSave,
      monthlyRate: f.autoSave ? parseFloat(f.monthlyRate) : undefined,
      targetDate: f.targetDate || undefined,
      colorClass: f.colorClass,
      deposits: existingGoal ? existingGoal.deposits : []
    };

    if (this.editingGoalId()) {
      this.savingsService.updateGoal(goalData);
    } else {
      this.savingsService.addGoal(goalData);
    }
    this.goToList();
  }

  recalcDate() {
    const f = this.form();
    if (!f.autoSave || !f.targetAmount || !f.monthlyRate) {
      this.form.update(old => ({ ...old, targetDate: '' }));
      return;
    }
    const target = parseFloat(f.targetAmount);
    const rate = parseFloat(f.monthlyRate);
    const existingGoal = this.editingGoalId() ? this.goals().find(g => g.id === this.editingGoalId()) : null;
    const current = existingGoal ? existingGoal.currentAmount : 0;

    if (rate > 0 && target > current) {
      const months = Math.ceil((target - current) / rate);
      const d = new Date();
      d.setMonth(d.getMonth() + months);
      this.form.update(old => ({ ...old, targetDate: d.toISOString().split('T')[0] }));
    }
  }

  updateField(field: string, value: any) {
    this.form.update(f => ({ ...f, [field]: value }));
    if (['targetAmount', 'monthlyRate', 'autoSave'].includes(field)) {
      this.recalcDate();
    }
  }


  
  // Layout Helpers
  get stackAreaHeight(): string {
    const n = this.goals().length;
    return n === 0 ? '0px' : (160 + (n - 1) * 90 + 28) + 'px';
  }

  get holderHeight(): string {
    return (232 + parseInt(this.stackAreaHeight)) + 'px';
  }

  getStackBottom(index: number): string {
    return (16 + (this.goals().length - 1 - index) * 90) + 'px';
  }

  getZIndex(index: number): number {
    return 50 + (this.goals().length - 1 - index) * 10;
  }

  getProgress(goal: SavingsGoal): number {
    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  }

  getWaveRise(goal: SavingsGoal): number {
    return -(this.getProgress(goal) / 100) * 198;
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
}