import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  profile_color?: string; // ← added
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly TOKEN_KEY = 'authToken';
  private readonly CURRENT_USER_KEY = 'current_user';
  private readonly apiUrl = environment.apiUrl;
  

  public isLoggedIn = signal(this.checkLoggedIn());

  public register(username: string, email: string, password: string) {
    return this.http.post(`${this.apiUrl}/api/auth/register`, { username, email, password });
  }

  public async login(email: string, password: string): Promise<User> {
    const res = await firstValueFrom(
      this.http.post<User & { accessToken: string }>(`${this.apiUrl}/api/auth/login`, {
        email,
        password,
      }),
    );
    const { accessToken, ...user } = res;
    sessionStorage.setItem(this.TOKEN_KEY, accessToken);
    sessionStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
    this.isLoggedIn.set(true);
    return user as User;
  }

  public logout(): void {
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.CURRENT_USER_KEY);
    this.isLoggedIn.set(false);
  }

  public getToken(): string | null {
    return sessionStorage.getItem(this.TOKEN_KEY);
  }

  public getCurrentUser(): User | null {
    return JSON.parse(sessionStorage.getItem(this.CURRENT_USER_KEY) ?? 'null');
  }

  public checkLoggedIn(): boolean {
    const token = sessionStorage.getItem(this.TOKEN_KEY);
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  public async refresh(): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<{ accessToken: string }>(
        `${this.apiUrl}/api/auth/refresh`,
        {},
        { withCredentials: true }
      )
    );
    sessionStorage.setItem(this.TOKEN_KEY, res.accessToken);
  }

  public getProfileColor(): string {
    return this.getCurrentUser()?.profile_color
      ?? localStorage.getItem('profileColor')
      ?? '#7B50DC';
  }

  public async saveProfileColor(color: string): Promise<void> {
    await firstValueFrom(
      this.http.patch(`${this.apiUrl}/api/auth/profile-color`, { color })
    );
    const user = this.getCurrentUser();
    if (user) {
      user.profile_color = color;
      sessionStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
    }
  }
}