import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  let token: string | null = null;
  try {
    token = localStorage.getItem('mapu_token');
  } catch {}

  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  const esLogin = req.url.includes('/api/login') || req.url.includes('/api/register');

  return next(req).pipe(
    catchError((err) => {
      if (err.status === 401 && !esLogin) {
        try {
          localStorage.removeItem('mapu_token');
          localStorage.removeItem('mapu_user');
        } catch {}
        router.navigateByUrl('/login', { replaceUrl: true });
      }
      return throwError(() => err);
    })
  );
};