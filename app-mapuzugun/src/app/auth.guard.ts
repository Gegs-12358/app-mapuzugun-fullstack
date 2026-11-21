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

/**
 * Para jugar, la cuenta necesita un correo para recuperar la contraseña.
 * Solo se exige si el servidor puede enviar correos (correo_requerido).
 */
export const correoGuard: CanActivateFn = () => {
  try {
    const user = JSON.parse(localStorage.getItem('mapu_user') || '{}');
    if (user.correo_requerido && user.tiene_correo === false) {
      return inject(Router).createUrlTree(['/correo']);
    }
  } catch {}
  return true;
};

/** Login y registro: con sesión iniciada, se va directo al mapa. */
export const invitadoGuard: CanActivateFn = () =>
  hayToken() ? inject(Router).createUrlTree(['/units']) : true;
