import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.checkLoggedIn()) return true;

  // Encode the attempted URL into the redirect
  return router.parseUrl(`/login?returnUrl=${encodeURIComponent(state.url)}`);
};