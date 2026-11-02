import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { DesktopWindowComponent } from './desktop-window';
import { MyComputerComponent } from './my-computer';

/** Opóźnienie zwijania menu po zjechaniu kursorem (ms). */
const MENU_HIDE_DELAY = 350;

/**
 * Pulpit użytkownika: tapeta na całym ekranie, wysuwane menu przy górnej
 * krawędzi (z ikoną zalogowanego użytkownika i wylogowaniem) oraz ikona
 * „Mój komputer" otwierająca okno z dyskiem.
 */
@Component({
  selector: 'app-desktop',
  imports: [DesktopWindowComponent, MyComputerComponent],
  template: `
    <div class="desktop" (click)="closeUserMenu()">
      <div class="desktop-wall" aria-hidden="true"></div>

      <div class="desktop-edge" (mouseenter)="revealMenu()" (click)="toggleMenu()"></div>

      <header
        class="desktop-menu"
        [class.is-open]="menuOpen()"
        (mouseenter)="revealMenu()"
        (mouseleave)="scheduleHideMenu()"
      >
        <div class="desktop-user" [class.is-open]="userMenuOpen()">
          <button
            type="button"
            class="desktop-user-trigger"
            aria-haspopup="true"
            [attr.aria-expanded]="userMenuOpen()"
            (click)="toggleUserMenu($event)"
          >
            @if (me(); as user) {
              <img class="desktop-avatar" [src]="avatarUrl(user.username)" [alt]="user.username" />
              <span class="desktop-user-name">{{ user.username }}</span>
            } @else {
              <span class="desktop-user-name">Konto</span>
            }
            <span class="desktop-caret" aria-hidden="true">▾</span>
          </button>

          @if (userMenuOpen()) {
            <div class="desktop-user-menu" role="menu">
              <p class="desktop-user-menu-name">{{ me()?.username }}</p>
              <p class="desktop-user-menu-role">{{ roleLabel() }}</p>
              <hr />
              <button type="button" class="desktop-user-menu-item" role="menuitem" (click)="logout()">
                🚪 Wyloguj
              </button>
            </div>
          }
        </div>
      </header>

      <div class="desktop-icons">
        <button
          type="button"
          class="desktop-icon"
          [class.is-active]="computerOpen() && !computerMinimized()"
          (click)="openComputer()"
        >
          <span class="desktop-icon-art" aria-hidden="true">🖥️</span>
          <span class="desktop-icon-label">Mój komputer</span>
        </button>
      </div>

      @if (computerOpen()) {
        <app-desktop-window
          title="Mój komputer"
          [minimized]="computerMinimized()"
          (close)="closeComputer()"
          (minimize)="minimizeComputer()"
        >
          <app-my-computer />
        </app-desktop-window>
      }

      @if (computerMinimized()) {
        <button type="button" class="desktop-taskbar" (click)="openComputer()">
          <span aria-hidden="true">🖥️</span>
          <span>Mój komputer</span>
        </button>
      }
    </div>
  `,
  styles: `
    .desktop {
      position: fixed;
      inset: 0;
      overflow: hidden;
    }

    .desktop-wall {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse 70% 55% at 12% 0%, rgba(94, 129, 255, 0.4), transparent 60%),
        radial-gradient(ellipse 65% 50% at 92% 8%, rgba(96, 200, 220, 0.32), transparent 58%),
        linear-gradient(165deg, #1c2749 0%, #223055 46%, #141d38 100%);
    }

    /* Cienka, lekko widoczna strefa przy górnej krawędzi — najechanie wysuwa menu. */
    .desktop-edge {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 12px;
      z-index: 40;
      cursor: pointer;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0));
    }

    .desktop-edge::after {
      content: '';
      position: absolute;
      top: 3px;
      left: 50%;
      width: 72px;
      height: 4px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.45);
      transform: translateX(-50%);
    }

    .desktop-menu {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 45;
      display: flex;
      align-items: center;
      padding: 0.45rem 0.9rem;
      background: rgba(14, 21, 42, 0.94);
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 14px 32px rgba(6, 10, 24, 0.45);
      transform: translateY(-105%);
      transition: transform 0.22s ease;
    }

    .desktop-menu.is-open {
      transform: translateY(0);
    }

    .desktop-user {
      position: relative;
    }

    .desktop-user-trigger {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.4rem 0.8rem 0.4rem 0.45rem;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      font: inherit;
      font-weight: 700;
      font-size: 0.92rem;
      cursor: pointer;
      transition: background 0.18s ease;
    }

    .desktop-user-trigger:hover {
      background: rgba(255, 255, 255, 0.18);
    }

    .desktop-avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      object-fit: cover;
      display: block;
      border: 2px solid rgba(255, 255, 255, 0.55);
    }

    .desktop-caret {
      font-size: 0.75rem;
      opacity: 0.85;
    }

    .desktop-user-menu {
      position: absolute;
      top: calc(100% + 0.5rem);
      left: 0;
      min-width: 14rem;
      padding: 0.6rem 0.5rem 0.5rem;
      background: rgba(22, 31, 58, 0.98);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 14px;
      box-shadow: 0 18px 40px rgba(6, 10, 24, 0.5);
      color: #fff;
    }

    .desktop-user-menu-name {
      margin: 0 0 0.15rem;
      padding: 0 0.5rem;
      font-weight: 700;
      font-size: 0.95rem;
    }

    .desktop-user-menu-role {
      margin: 0;
      padding: 0 0.5rem;
      font-size: 0.82rem;
      color: rgba(255, 255, 255, 0.65);
    }

    .desktop-user-menu hr {
      margin: 0.55rem 0.25rem;
      border: 0;
      border-top: 1px solid rgba(255, 255, 255, 0.14);
    }

    .desktop-user-menu-item {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      width: 100%;
      padding: 0.55rem 0.6rem;
      border: 0;
      border-radius: 10px;
      background: transparent;
      color: #fff;
      font: inherit;
      font-weight: 600;
      font-size: 0.9rem;
      text-align: left;
      cursor: pointer;
      transition: background 0.18s ease;
    }

    .desktop-user-menu-item:hover {
      background: rgba(255, 255, 255, 0.14);
    }

    .desktop-icons {
      position: absolute;
      top: 3.25rem;
      left: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .desktop-icon {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      width: 96px;
      padding: 0.7rem 0.5rem;
      border: 1px solid transparent;
      border-radius: 12px;
      background: transparent;
      color: #fff;
      font: inherit;
      cursor: pointer;
      transition: background 0.18s ease, border-color 0.18s ease;
    }

    .desktop-icon:hover,
    .desktop-icon:focus-visible {
      background: rgba(255, 255, 255, 0.16);
      border-color: rgba(255, 255, 255, 0.28);
      outline: none;
    }

    .desktop-icon.is-active {
      background: rgba(255, 255, 255, 0.22);
      border-color: rgba(255, 255, 255, 0.4);
    }

    .desktop-icon-art {
      font-size: 2.4rem;
      line-height: 1;
    }

    .desktop-icon-label {
      font-size: 0.82rem;
      font-weight: 600;
      text-align: center;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.55);
    }

    .desktop-taskbar {
      position: absolute;
      left: 1.25rem;
      bottom: 1.25rem;
      z-index: 30;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.55rem 0.95rem;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      background: rgba(14, 21, 42, 0.9);
      color: #fff;
      font: inherit;
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;
      transition: background 0.18s ease;
    }

    .desktop-taskbar:hover {
      background: rgba(40, 56, 100, 0.95);
    }
  `,
})
export class DesktopPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly me = this.auth.me;
  readonly roleLabel = computed(() => (this.me()?.role === 'admin' ? 'Administrator' : 'Użytkownik'));

  readonly menuOpen = signal(false);
  readonly userMenuOpen = signal(false);

  readonly computerOpen = signal(false);
  readonly computerMinimized = signal(false);

  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  avatarUrl(username: string): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;
  }

  revealMenu(): void {
    this.clearHideTimer();
    this.menuOpen.set(true);
  }

  /** Zwija menu po chwili — dzięki opóźnieniu kursor zdąży wrócić na belkę. */
  scheduleHideMenu(): void {
    if (this.userMenuOpen()) {
      return;
    }
    this.clearHideTimer();
    this.hideTimer = setTimeout(() => this.menuOpen.set(false), MENU_HIDE_DELAY);
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  toggleUserMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.revealMenu();
    this.userMenuOpen.update((open) => !open);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  logout(): void {
    this.closeUserMenu();
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  openComputer(): void {
    this.computerOpen.set(true);
    this.computerMinimized.set(false);
  }

  closeComputer(): void {
    this.computerOpen.set(false);
    this.computerMinimized.set(false);
  }

  minimizeComputer(): void {
    this.computerMinimized.set(true);
  }

  private clearHideTimer(): void {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}
