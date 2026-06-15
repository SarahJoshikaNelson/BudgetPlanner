import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && token) {
        return from(auth.refresh()).pipe(
          switchMap(() => {
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${auth.getToken()}` }
            });
            return next(retryReq);
          }),
          catchError(() => {
            auth.logout();
            // Preserve current page so user returns after re-login
            const returnUrl = encodeURIComponent(router.url);
            router.navigate(['/login'], { queryParams: { returnUrl } });
            return throwError(() => err);
          })
        );
      }
      return throwError(() => err);
    })
  );
};