import { Routes } from '@angular/router';
import { authGuard, invitadoGuard } from './auth.guard';

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
    canActivate: [authGuard],
    loadComponent: () => import('./pages/units/units.page').then(m => m.UnitsPage)
  },
  {
    path: 'home/:unitId/:stage',
    canActivate: [authGuard],
    loadComponent: () => import('./home/home.page').then(m => m.HomePage)
  },
  {
    // Repaso de las palabras que más le han costado a la persona (usa la misma pantalla de lección)
    path: 'repaso',
    canActivate: [authGuard],
    loadComponent: () => import('./home/home.page').then(m => m.HomePage)
  },
  {
    path: 'acerca',
    loadComponent: () => import('./pages/acerca/acerca.page').then(m => m.AcercaPage)
  },
  // Cualquier dirección desconocida vuelve al inicio
  { path: '**', redirectTo: 'intro' }
];