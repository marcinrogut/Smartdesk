import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/guards';

export const routes: Routes = [
  {
    path: '',
    title: 'SmartDesk — twoje pliki w chmurze',
    loadComponent: () => import('./features/home/home').then((m) => m.HomePage),
  },
  {
    path: 'login',
    title: 'Logowanie — SmartDesk',
    loadComponent: () => import('./features/auth/login').then((m) => m.LoginPage),
  },
  {
    path: 'desktop',
    title: 'Mój dysk — SmartDesk',
    canActivate: [authGuard],
    loadComponent: () => import('./features/desktop/desktop').then((m) => m.DesktopPage),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin-layout').then((m) => m.AdminLayoutPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'users' },
      {
        path: 'users',
        title: 'Użytkownicy — SmartDesk',
        loadComponent: () => import('./features/admin/admin-users').then((m) => m.AdminUsersPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
