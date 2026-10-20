import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'units',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'units',
    loadComponent: () => import('./pages/units/units.page').then( m => m.UnitsPage)
  },
  {
    path: 'home/:unitId/:stage',
    loadComponent: () => import('./home/home.page').then( m => m.HomePage) // 👈 Lazy loading
  }
];