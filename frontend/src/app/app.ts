import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly auth = inject(AuthService);

  readonly me = this.auth.me;
  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly isAdmin = this.auth.isAdmin;

  /** Aktywny dropdown użytkownika (albo null). */
  readonly userMenuOpen = signal(false);

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.auth.ensureMe().subscribe();
    }
  }

  avatarUrl(username: string): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((open) => !open);
  }

  closeMenus(): void {
    this.userMenuOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
    this.closeMenus();
  }
}
