import { Component, HostListener, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { Theme } from '../../theme';
import { Login } from '../login/login';
import { AuthService } from '../../services/auth.service';
import { WorkspaceService } from '../../services/workspace.service';

interface NavItem {
  path: string;
  label: string;
}

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, Login],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css'
})
export class NavBar {
  showLogin = false;
  showProfile = false;
  intendedRoute: string | null = null;

  private allNavItems: NavItem[] = [
    { path: '/income-expenses', label: 'Income/Expenses' },
    { path: '/financedashboard', label: 'Dashboard' },
    { path: '/savings',         label: 'Savings' },
    { path: '/notes',           label: 'Notes' }
  ];

  profileColors = [
    '#7B50DC', '#4F8FDC', '#DC5050', '#50DC8F',
    '#DC9A50', '#DC50B0', '#50C8DC', '#9ADC50'
  ];

  protected authService   = inject(AuthService);
  public workspaceService = inject(WorkspaceService);
  private router          = inject(Router);

  profileColor = signal<string>(this.authService.getProfileColor());

  readonly visibleNavLinks = computed(() =>
    this.allNavItems.filter(item => this.workspaceService.canAccess(item.path))
  );

  readonly isViewOnly = computed(() => {
    const p = this.workspaceService.activePermissions();
    if (!p) return false;
    return p.dashboard !== 'write'
      && p.transactions !== 'write'
      && p.savings !== 'write'
      && p.notes !== 'write';
  });

  readonly showWorkspaceBanner = computed(() =>
    this.authService.isLoggedIn()
    && this.workspaceService.isInWorkspace()
    && !this.workspaceService.activeWorkspace()?.isShareAcc
  );

  readonly workspaceName = computed(() => {
    const name = this.workspaceService.activeWorkspace()?.name ?? '';
    if (name.includes('↔')) {
      return name.split('↔').pop()?.trim() ?? name;
    }
    return name;
  });

  constructor(public theme: Theme) {
    effect(() => {
      if (this.authService.isLoggedIn()) {
        this.profileColor.set(this.authService.getProfileColor());
      }
    });
  }

  navigateToProtected(route: string) {
    if (this.authService.isLoggedIn()) {
      this.router.navigate([route]);
    } else {
      this.intendedRoute = route;
      this.showLogin = true;
    }
  }

  onLoginSuccess() {
    this.showLogin = false;
    if (this.intendedRoute) {
      this.router.navigate([this.intendedRoute]);
      this.intendedRoute = null;
    }
  }

  onProfileClick() {
    if (this.authService.isLoggedIn()) {
      this.showProfile = !this.showProfile;
      this.showLogin = false;
    } else {
      this.showLogin = true;
      this.showProfile = false;
    }
  }

  async setColor(color: string) {
    this.profileColor.set(color);
    localStorage.setItem('profileColor', color);
    try {
      await this.authService.saveProfileColor(color);
    } catch {
      // silent fail — localStorage keeps it as fallback
    }
  }

  logout() {
    this.authService.logout();
    this.showProfile = false;
    this.router.navigate(['/']);
  }

  getInitial(): string {
    const user = this.authService.getCurrentUser();
    return user?.name?.charAt(0).toUpperCase() ?? '?';
  }

  @HostListener('window:scroll')
  onScroll() {
    const navbar = document.querySelector('nav') as HTMLElement;
    if (!navbar) return;
    const blur = Math.min(window.scrollY / 70, 20);
    navbar.style.backdropFilter = `blur(${blur}px)`;
    (navbar.style as any)['webkitBackdropFilter'] = `blur(${blur}px)`;
  }
}