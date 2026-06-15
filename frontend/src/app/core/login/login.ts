import { Component, signal, WritableSignal, inject, Output, EventEmitter } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { form, FormField, required, pattern, minLength } from '@angular/forms/signals';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SavingsService } from '../../services/savingService';
import { NoteService } from '../../services/note.service';
import { firstValueFrom } from 'rxjs';
import { TransactionService } from '../../services/transactionService';
import { FinanceService } from '../../services/financeService';

type LoginFormModel = {
  email: string,
  password: string
}

type RegisterFormModel = {
  username: string,
  email: string,
  password: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-login',
  imports: [MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatTabsModule, FormField],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private static readonly DEFAULT_LOGIN_MODEL: LoginFormModel = { email: '', password: '' };
  private static readonly DEFAULT_REGISTER_MODEL: RegisterFormModel = { username: '', email: '', password: '' };

  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute); // ← added
  private readonly savingsService = inject(SavingsService);
  private readonly noteService = inject(NoteService);
  protected authService = inject(AuthService);
  private readonly transactionService = inject(TransactionService);
  private readonly financeService = inject(FinanceService);
  @Output() loginSuccess = new EventEmitter<void>();

  private readonly loginFormModel: WritableSignal<LoginFormModel> = signal(Login.DEFAULT_LOGIN_MODEL);
  private readonly registerFormModel: WritableSignal<RegisterFormModel> = signal(Login.DEFAULT_REGISTER_MODEL);

  protected readonly loginForm = form(this.loginFormModel, path => {
    required(path.email, { message: 'Email is required.' }),
    required(path.password, { message: 'Password is required.' })
  });

  protected readonly registerForm = form(this.registerFormModel, path => {
    required(path.username, { message: 'Username is required.' }),
    required(path.email, { message: 'Email is required.' }),
    pattern(path.email, EMAIL_REGEX, { message: 'Please enter a valid email address.' }),
    required(path.password, { message: 'Password is required.' }),
    minLength(path.password, 8, { message: 'Password must be at least 8 characters long.' })
  });

  private redirectAfterLogin(): void { // ← added
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
    this.router.navigateByUrl(returnUrl);
  }

  public async login(): Promise<void> {
    if (this.loginForm().invalid()) return;
    const { email, password } = this.loginForm().value();

    try {
      await this.authService.login(email, password);
      this.savingsService.loadGoals();
      this.noteService.reloadNotes();
      this.loginFormModel.set(Login.DEFAULT_LOGIN_MODEL);
      this.transactionService.loadTransactions();
      this.financeService.loadEntries();
      this.loginForm().reset();
      this.loginSuccess.emit();
      this.snackBar.open('Erfolgreich eingeloggt!', 'OK', { duration: 3000 });
      this.redirectAfterLogin(); // ← added
    } catch {
      this.snackBar.open('Email oder Password falsch!', 'OK', { duration: 3000 });
    }
  }

  public async register(): Promise<void> {
    if (this.registerForm().invalid()) return;
    const { username, email, password } = this.registerForm().value();

    try {
      await firstValueFrom(this.authService.register(username, email, password));
      await this.authService.login(email, password);
      this.savingsService.loadGoals();
      this.noteService.reloadNotes();
      this.financeService.loadEntries();
      this.transactionService.loadTransactions();
      this.registerFormModel.set(Login.DEFAULT_REGISTER_MODEL);
      this.registerForm().reset();
      this.loginSuccess.emit();
      this.snackBar.open('Account erstellt!', 'OK', { duration: 3000 });
      this.redirectAfterLogin(); // ← added
    } catch {
      this.snackBar.open('Diese Email ist bereits registriert!', 'OK', { duration: 3000 });
    }
  }

  public async logout(): Promise<void> {
    await this.authService.logout();
    this.loginSuccess.emit();
    this.router.navigate(['/']);
    this.snackBar.open('Erfolgreich ausgeloggt!', 'OK', { duration: 3000 });
  }
}