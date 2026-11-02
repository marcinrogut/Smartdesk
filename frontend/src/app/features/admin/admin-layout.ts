import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <section class="hero">
      <h1 class="hero-brand">⚙️ Panel administratora</h1>
      <p class="hero-lead">Zarządzaj kontami użytkowników SmartDesk</p>
    </section>

    <nav class="toolbar" aria-label="Sekcje panelu">
      <a routerLink="users" routerLinkActive="is-active" class="nav-tab">👥 Użytkownicy</a>
    </nav>

    <router-outlet />
  `,
})
export class AdminLayoutPage {}
