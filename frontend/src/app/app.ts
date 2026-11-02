import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly me = this.auth.me;
  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly isAdmin = this.auth.isAdmin;

  /** Aktywny dropdown użytkownika (albo null). */
  readonly userMenuOpen = signal(false);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** Pulpit rysuje własną powłokę — nagłówek i stopka strony są wtedy zbędne. */
  readonly isDesktop = computed(() => this.currentUrl().startsWith('/desktop'));

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.auth.ensureMe().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
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
