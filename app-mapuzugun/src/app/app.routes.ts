import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'units',
    pathMatch: 'full'
  },
  {
    path: 'units',
    loadComponent: () => import('./pages/units/units.page').then( m => m.UnitsPage)
  },
  {
    path: 'home/:unitId',
    loadComponent: () => import('./home/home.page').then( m => m.HomePage) // <--- Ruta corregida
  }
];