import { Routes } from '@angular/router';
import { authGuard, correoGuard, invitadoGuard } from './auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'intro',
    pathMatch: 'full'
  },
  {
    path: 'intro',
    loadComponent: () => import('./pages/intro/intro.page').then(m => m.IntroPage)
  },
  {
    path: 'login',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'register',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage)
  },
  {
    path: 'units',
    canActivate: [authGuard, correoGuard],
    loadComponent: () => import('./pages/units/units.page').then(m => m.UnitsPage)
  },
  {
    path: 'home/:unitId/:stage',
    canActivate: [authGuard, correoGuard],
    loadComponent: () => import('./home/home.page').then(m => m.HomePage)
  },
  {
    // Repaso de las palabras que más le han costado a la persona (usa la misma pantalla de lección)
    path: 'repaso',
    canActivate: [authGuard, correoGuard],
    loadComponent: () => import('./home/home.page').then(m => m.HomePage)
  },
  {
    // Todas las palabras vistas, con cómo va cada una en el repaso espaciado
    path: 'palabras',
    canActivate: [authGuard, correoGuard],
    loadComponent: () => import('./pages/palabras/palabras.page').then(m => m.PalabrasPage)
  },
  {
    // Agregar o cambiar el correo de la cuenta
    path: 'correo',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/correo/correo.page').then(m => m.CorreoPage)
  },
  {
    path: 'recuperar',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/recuperar/recuperar.page').then(m => m.RecuperarPage)
  },
  {
    path: 'acerca',
    loadComponent: () => import('./pages/acerca/acerca.page').then(m => m.AcercaPage)
  },
  // Cualquier dirección desconocida vuelve al inicio
  { path: '**', redirectTo: 'intro' }
];