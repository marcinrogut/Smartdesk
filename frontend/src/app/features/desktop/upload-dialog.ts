import { Component, input, output, signal } from '@angular/core';

/** Pojedynczy plik w kolejce wysyłania. */
export interface UploadItem {
  id: number;
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error: string | null;
}

/**
 * Modal wgrywania plików: strefa przeciągania, wybór z dysku i lista plików
 * z paskami postępu. Kolejkę wysyłania prowadzi rodzic — komponent tylko
 * zgłasza wybrane pliki i zamknięcie.
 */
@Component({
  selector: 'app-upload-dialog',
  template: `
    <div class="dialog" role="dialog" aria-modal="true" aria-label="Wgrywanie plików">
      <header class="head">
        <span>Wgrywanie plików</span>
      </header>

      <label
        class="dropzone"
        [class.is-active]="dragActive()"
        (dragover)="onDragOver($event)"
        (dragleave)="dragActive.set(false)"
        (drop)="onDrop($event)"
      >
        <span class="dropzone-art" aria-hidden="true">⬆️</span>
        <span class="dropzone-text">Przeciągnij pliki tutaj lub kliknij, aby je wybrać</span>
        <input type="file" multiple class="visually-hidden" (change)="onFilesSelected($event)" />
      </label>

      @if (items().length > 0) {
        <ul class="uploads">
          @for (item of items(); track item.id) {
            <li class="upload">
              <div class="upload-row">
                <span class="upload-name" [title]="item.name">{{ item.name }}</span>
                <span class="upload-state">{{ stateLabel(item) }}</span>
              </div>
              <span
                class="progress"
                [class.is-done]="item.status === 'done'"
                [class.is-error]="item.status === 'error'"
              >
                <span class="progress-fill" [style.width.%]="item.progress"></span>
              </span>
              @if (item.error; as message) {
                <p class="upload-error">{{ message }}</p>
              }
            </li>
          }
        </ul>
      } @else {
        <p class="muted">Nie wybrano jeszcze żadnych plików.</p>
      }

      <footer class="foot">
        <span class="summary">{{ summary() }}</span>
        <button type="button" class="btn-secondary btn-inline" (click)="closed.emit()">Zamknij</button>
      </footer>
    </div>
  `,
  host: {
    '(click)': 'onBackdropClick($event)',
  },
  styles: `
    :host {
      position: absolute;
      inset: 0;
      z-index: 4;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: rgba(12, 18, 36, 0.5);
    }

    .dialog {
      width: min(520px, 100%);
      max-height: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      padding: 1rem;
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 24px 60px rgba(9, 15, 32, 0.4);
      overflow: auto;
    }

    .head {
      font-weight: 700;
    }

    .dropzone {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      padding: 1.35rem 1rem;
      border: 2px dashed rgba(59, 91, 219, 0.35);
      border-radius: 12px;
      background: rgba(59, 91, 219, 0.05);
      text-align: center;
      cursor: pointer;
      transition: background 0.18s ease, border-color 0.18s ease;
    }

    .dropzone.is-active {
      background: rgba(59, 91, 219, 0.16);
      border-color: var(--accent);
    }

    .dropzone-art {
      font-size: 1.6rem;
      line-height: 1;
    }

    .dropzone-text {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--ink-muted);
    }

    .uploads {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
      max-height: 240px;
      overflow: auto;
    }

    .upload-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.3rem;
    }

    .upload-name {
      font-size: 0.88rem;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .upload-state {
      flex: 0 0 auto;
      font-size: 0.8rem;
      color: var(--ink-muted);
    }

    .upload-error {
      margin: 0.3rem 0 0;
      font-size: 0.82rem;
      color: var(--danger);
    }

    .progress {
      display: block;
      height: 8px;
      border-radius: 999px;
      background: rgba(27, 37, 64, 0.12);
      overflow: hidden;
    }

    .progress-fill {
      display: block;
      height: 100%;
      width: 0;
      border-radius: 999px;
      background: linear-gradient(135deg, var(--accent), var(--accent-dark));
      transition: width 0.15s ease;
    }

    .progress.is-done .progress-fill {
      background: var(--ok);
    }

    .progress.is-error .progress-fill {
      background: var(--danger);
    }

    .muted {
      margin: 0.5rem 0;
      color: var(--ink-muted);
    }

    .foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .summary {
      font-size: 0.82rem;
      color: var(--ink-muted);
    }
  `,
})
export class UploadDialogComponent {
  readonly items = input.required<UploadItem[]>();
  readonly summary = input('');

  readonly added = output<File[]>();
  readonly closed = output<void>();

  readonly dragActive = signal(false);

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files ?? []);
    input.value = '';
    this.emitFiles(selected);
  }

  onDragOver(event: DragEvent): void {
    if (!this.hasFiles(event)) {
      return;
    }
    event.preventDefault();
    this.dragActive.set(true);
  }

  onDrop(event: DragEvent): void {
    if (!this.hasFiles(event)) {
      return;
    }
    event.preventDefault();
    this.dragActive.set(false);
    this.emitFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  stateLabel(item: UploadItem): string {
    switch (item.status) {
      case 'done':
        return 'Wgrano';
      case 'error':
        return 'Błąd';
      default:
        return `${item.progress}%`;
    }
  }

  private emitFiles(files: File[]): void {
    if (files.length > 0) {
      this.added.emit(files);
    }
  }

  /** Czy przeciągane dane zawierają pliki (a nie np. zaznaczony tekst). */
  private hasFiles(event: DragEvent): boolean {
    return Array.from(event.dataTransfer?.types ?? []).includes('Files');
  }
}
