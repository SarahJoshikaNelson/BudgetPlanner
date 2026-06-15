import { Injectable, signal, computed, inject } from '@angular/core';
import { SavingsGoal } from '../models/savingModel';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

const API = '/api/savings';

@Injectable({
  providedIn: 'root'
})
export class SavingsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly goalsSignal = signal<SavingsGoal[]>([]);

  public goals = computed(() => this.goalsSignal());

  constructor() {
    if (this.authService.checkLoggedIn()) {
      this.loadGoals();
    }
  }

  public loadGoals(callback?: () => void) {
    this.http.get<SavingsGoal[]>(API).subscribe(goals => {
      this.goalsSignal.set(goals);
      callback?.();
    });
  }

  public addGoal(goal: SavingsGoal) {
    this.http.post(API, goal).subscribe(() => this.loadGoals());
  }

  public updateGoal(goal: SavingsGoal) {
    this.http.put(`${API}/${goal.id}`, goal).subscribe(() => this.loadGoals());
  }

  public deleteGoal(id: string) {
    this.http.delete(`${API}/${id}`).subscribe(() => this.loadGoals());
  }

  public addDeposit(goalId: string, amount: number) {
    return this.http.post(`${API}/${goalId}/deposit`, { amount });
  }
}