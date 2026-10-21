import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  // Las rutas que empiezan con /api apuntan al backend configurado
  if (req.url.startsWith('/api')) {
    req = req.clone({ url: environment.apiUrl + req.url });
  }

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