import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

function hayToken(): boolean {
  try {
    return !!localStorage.getItem('mapu_token');
  } catch {
    return false;
  }
}

/** Páginas que necesitan sesión: sin token, se va al login. */
export const authGuard: CanActivateFn = () =>
  hayToken() ? true : inject(Router).createUrlTree(['/login']);

/** Login y registro: con sesión iniciada, se va directo al mapa. */
export const invitadoGuard: CanActivateFn = () =>
  hayToken() ? inject(Router).createUrlTree(['/units']) : true;
