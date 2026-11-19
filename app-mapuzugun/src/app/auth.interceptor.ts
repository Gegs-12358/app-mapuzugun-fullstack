import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, retry, throwError, timer } from 'rxjs';
import { environment } from '../environments/environment';
import { ServidorService } from './servidor.service';

// Pasado este tiempo sin respuesta, se muestra el aviso de "despertando el servidor"
const MS_HASTA_AVISO = 4000;

// Errores típicos mientras Render enciende el servidor
const ESTADOS_REINTENTABLES = [0, 502, 503, 504];
const MAX_REINTENTOS = 4;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const servidor = inject(ServidorService);

  const esApi = req.url.startsWith('/api');

  // Las rutas que empiezan con /api apuntan al backend configurado
  if (esApi) {
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

  // Solo se reintentan las lecturas: repetir un POST podría sumar dos veces
  // la misma lección o restar dos vidas.
  const reintentable = esApi && req.method === 'GET';

  // Cada petición se cuenta como lenta una sola vez, la marque el temporizador
  // o un reintento (lo que ocurra primero).
  let marcada = false;
  const marcar = () => {
    if (marcada) return;
    marcada = true;
    servidor.marcarLenta();
  };
  const aviso = esApi ? setTimeout(marcar, MS_HASTA_AVISO) : null;

  return next(req).pipe(
    retry({
      count: reintentable ? MAX_REINTENTOS : 0,
      delay: (err: HttpErrorResponse, intento) => {
        if (!ESTADOS_REINTENTABLES.includes(err.status)) return throwError(() => err);
        marcar();
        return timer(intento * 3000); // 3 s, 6 s, 9 s, 12 s
      }
    }),
    catchError((err) => {
      if (err.status === 401 && !esLogin) {
        try {
          localStorage.removeItem('mapu_token');
          localStorage.removeItem('mapu_user');
        } catch {}
        router.navigateByUrl('/login', { replaceUrl: true });
      }
      return throwError(() => err);
    }),
    finalize(() => {
      if (aviso) clearTimeout(aviso);
      if (marcada) servidor.desmarcarLenta();
    })
  );
};
