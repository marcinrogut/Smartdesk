import { Component, input, output, signal } from '@angular/core';

/** Za co chwyta użytkownik podczas zmiany rozmiaru. */
type ResizeMode = 'e' | 's' | 'se';

type InteractionMode = ResizeMode | 'drag';

const MIN_WIDTH = 400;
const MIN_HEIGHT = 280;

/** Ogranicza wartość do przedziału (odporny na odwrócone granice). */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * Okno pulpitu: przeciąganie za belkę tytułu, zmiana rozmiaru za krawędzie,
 * maksymalizacja i minimalizacja. Treść dostarcza rodzic przez `<ng-content>`.
 */
@Component({
  selector: 'app-desktop-window',
  template: `
    <section
      class="win"
      [class.is-maximized]="maximized()"
      [class.is-minimized]="minimized()"
      [style.left.px]="maximized() ? null : x()"
      [style.top.px]="maximized() ? null : y()"
      [style.width.px]="maximized() ? null : width()"
      [style.height.px]="maximized() ? null : height()"
    >
      <header class="win-bar" (pointerdown)="startDrag($event)" (dblclick)="onBarDoubleClick($event)">
        <span class="win-dot" aria-hidden="true">🖥️</span>
        <span class="win-title">{{ title() }}</span>
        <span class="win-spacer"></span>
        <div class="win-actions">
          <button type="button" class="win-btn" title="Minimalizuj" aria-label="Minimalizuj" (click)="minimize.emit()">
            &#8211;
          </button>
          <button
            type="button"
            class="win-btn"
            [title]="maximized() ? 'Przywróć rozmiar' : 'Maksymalizuj'"
            [attr.aria-label]="maximized() ? 'Przywróć rozmiar' : 'Maksymalizuj'"
            (click)="toggleMaximize()"
          >
            {{ maximized() ? '❐' : '▢' }}
          </button>
          <button type="button" class="win-btn is-close" title="Zamknij" aria-label="Zamknij" (click)="close.emit()">
            ✕
          </button>
        </div>
      </header>

      <div class="win-body">
        <ng-content />
      </div>

      @if (!maximized()) {
        <span class="win-grip is-e" (pointerdown)="startResize($event, 'e')"></span>
        <span class="win-grip is-s" (pointerdown)="startResize($event, 's')"></span>
        <span class="win-grip is-se" (pointerdown)="startResize($event, 'se')"></span>
      }
    </section>
  `,
  styles: `
    .win {
      position: fixed;
      z-index: 20;
      display: flex;
      flex-direction: column;
      background: #fff;
      border: 1px solid rgba(27, 37, 64, 0.18);
      border-radius: 14px;
      box-shadow: 0 30px 70px rgba(9, 15, 32, 0.45);
      overflow: hidden;
    }

    .win.is-maximized {
      inset: 0;
      border-radius: 0;
    }

    .win.is-minimized {
      display: none;
    }

    .win-bar {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.5rem 0.55rem 0.5rem 0.9rem;
      background: linear-gradient(135deg, #2c3b66, #1d2a4d);
      color: #fff;
      cursor: grab;
      user-select: none;
      touch-action: none;
    }

    .win-bar:active {
      cursor: grabbing;
    }

    .win-title {
      font-weight: 700;
      font-size: 0.95rem;
    }

    .win-spacer {
      flex: 1;
    }

    .win-actions {
      display: flex;
      gap: 0.25rem;
    }

    .win-btn {
      width: 30px;
      height: 26px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: 7px;
      background: rgba(255, 255, 255, 0.14);
      color: #fff;
      font: inherit;
      font-size: 0.85rem;
      line-height: 1;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .win-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .win-btn.is-close:hover {
      background: var(--danger);
    }

    .win-body {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    .win-grip {
      position: absolute;
      z-index: 2;
      touch-action: none;
    }

    .win-grip.is-e {
      top: 44px;
      right: 0;
      bottom: 14px;
      width: 8px;
      cursor: ew-resize;
    }

    .win-grip.is-s {
      left: 14px;
      right: 14px;
      bottom: 0;
      height: 8px;
      cursor: ns-resize;
    }

    .win-grip.is-se {
      right: 0;
      bottom: 0;
      width: 18px;
      height: 18px;
      cursor: nwse-resize;
    }

    .win-grip.is-se::after {
      content: '';
      position: absolute;
      right: 4px;
      bottom: 4px;
      width: 8px;
      height: 8px;
      border-right: 2px solid rgba(27, 37, 64, 0.35);
      border-bottom: 2px solid rgba(27, 37, 64, 0.35);
    }
  `,
})
export class DesktopWindowComponent {
  readonly title = input('Okno');
  readonly minimized = input(false);

  readonly close = output<void>();
  readonly minimize = output<void>();

  readonly maximized = signal(false);

  private readonly minWidth = MIN_WIDTH;
  private readonly minHeight = MIN_HEIGHT;

  readonly x = signal(Math.max(24, Math.round((window.innerWidth - 780) / 2)));
  readonly y = signal(Math.max(56, Math.round((window.innerHeight - 520) / 3)));
  readonly width = signal(clamp(780, MIN_WIDTH, window.innerWidth - 48));
  readonly height = signal(clamp(520, MIN_HEIGHT, window.innerHeight - 140));

  toggleMaximize(): void {
    this.maximized.update((value) => !value);
  }

  onBarDoubleClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('.win-btn')) {
      return;
    }
    this.toggleMaximize();
  }

  startDrag(event: PointerEvent): void {
    if (this.maximized() || event.button !== 0) {
      return;
    }
    if ((event.target as HTMLElement).closest('.win-btn')) {
      return;
    }
    this.beginInteraction(event, 'drag');
  }

  startResize(event: PointerEvent, mode: ResizeMode): void {
    if (this.maximized() || event.button !== 0) {
      return;
    }
    event.stopPropagation();
    this.beginInteraction(event, mode);
  }

  /**
   * Wspólna obsługa przeciągania i zmiany rozmiaru. Uchwyt przechwytuje wskaźnik
   * (setPointerCapture), więc listenery można trzymać na nim samym.
   */
  private beginInteraction(event: PointerEvent, mode: InteractionMode): void {
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);

    const origin = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: this.x(),
      y: this.y(),
      width: this.width(),
      height: this.height(),
    };

    const onMove = (moveEvent: PointerEvent): void => {
      const deltaX = moveEvent.clientX - origin.pointerX;
      const deltaY = moveEvent.clientY - origin.pointerY;

      if (mode === 'drag') {
        this.x.set(clamp(origin.x + deltaX, 0, window.innerWidth - this.width()));
        this.y.set(clamp(origin.y + deltaY, 0, window.innerHeight - 48));
        return;
      }

      if (mode === 'e' || mode === 'se') {
        this.width.set(clamp(origin.width + deltaX, this.minWidth, window.innerWidth - this.x()));
      }
      if (mode === 's' || mode === 'se') {
        this.height.set(clamp(origin.height + deltaY, this.minHeight, window.innerHeight - this.y()));
      }
    };

    const onEnd = (): void => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onEnd);
      handle.removeEventListener('pointercancel', onEnd);
      if (handle.hasPointerCapture(event.pointerId)) {
        handle.releasePointerCapture(event.pointerId);
      }
    };

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onEnd);
    handle.addEventListener('pointercancel', onEnd);
  }
}
