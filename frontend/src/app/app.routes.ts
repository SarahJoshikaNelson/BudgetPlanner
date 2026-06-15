import { Routes } from '@angular/router';

import { IncomeExpenses } from './pages/income-expenses/income-expenses';
import { Home } from './pages/home/home';
import { FinanceDashboard } from './pages/financedashboard/financedashboard';
import { Savings } from './pages/savings/savings';
import { Notes } from './pages/notes/notes';
import { SharedComponent } from './core/shared/shared';
import { Login } from './core/login/login';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login',            component: Login },
  { path: '',                 component: Home },
  { path: 'home',             component: Home },
  { path: 'income-expenses',  component: IncomeExpenses,    canActivate: [authGuard] },
  { path: 'financedashboard', component: FinanceDashboard,  canActivate: [authGuard] },
  { path: 'savings',          component: Savings,           canActivate: [authGuard] },
  { path: 'notes',            component: Notes,             canActivate: [authGuard] },
  { path: 'shared',           component: SharedComponent,   canActivate: [authGuard] },
];