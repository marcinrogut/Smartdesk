import { HttpEventType } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, concatMap, from, of, tap } from 'rxjs';
import { ApiError, fieldError, toApiError } from '../../core/api-error';
import { FilesService } from '../../core/files.service';
import { FileEntry } from '../../core/models';
import { formatBytes, formatDate } from '../../shared/format';
import { UploadDialogComponent, UploadItem } from './upload-dialog';

/** Widok okna „Mój komputer": ikona dysku albo zawartość katalogu. */
type ComputerView = 'computer' | 'drive';

/**
 * Zawartość okna „Mój komputer": ikona dysku, po kliknięciu zawartość katalogu
 * z paskiem narzędzi (Dodaj plik / Dodaj folder), obsługą przeciągania plików
 * do okna oraz modalem wgrywania z paskami postępu.
 */
@Component({
  selector: 'app-my-computer',
  imports: [ReactiveFormsModule, UploadDialogComponent],
  template: `
    <div
      class="mc"
      [class.is-drop-target]="dragActive()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      @if (view() === 'computer') {
        <div class="mc-drive-view">
          <button type="button" class="mc-drive" (click)="openDrive()">
            <span class="mc-drive-art" aria-hidden="true">🗄️</span>
            <span class="mc-drive-label">Dysk</span>
          </button>
        </div>
      } @else {
        <div class="mc-toolbar">
          <button type="button" class="mc-icon-btn" title="Wstecz" aria-label="Wstecz" (click)="back()">←</button>

          <nav class="mc-crumbs" aria-label="Ścieżka">
            <button type="button" (click)="open('')">🗄️ Dysk</button>
            @for (crumb of crumbs(); track crumb.path) {
              <span class="mc-crumb-sep" aria-hidden="true">›</span>
              <button type="button" (click)="open(crumb.path)">{{ crumb.name }}</button>
            }
          </nav>

          <span class="mc-spacer"></span>

          <button type="button" class="mc-btn" (click)="openUploadDialog()">⬆️ Dodaj plik</button>
          <button type="button" class="mc-btn" (click)="toggleFolderForm()">
            {{ folderFormOpen() ? '✕ Anuluj' : '📁 Dodaj folder' }}
          </button>
          <button type="button" class="mc-icon-btn" title="Odśwież" aria-label="Odśwież" [disabled]="loading()" (click)="reload()">
            🔄
          </button>
        </div>

        @if (error(); as message) {
          <div class="alert alert-error" role="alert">{{ message }}</div>
        }
        @if (notice(); as message) {
          <div class="alert alert-success" role="status">{{ message }}</div>
        }

        @if (folderFormOpen()) {
          <form class="mc-folder-form" [formGroup]="folderForm" (ngSubmit)="createFolder()">
            <div class="form-group">
              <label class="field-label" for="mc-folder-name">Nazwa folderu</label>
              <input id="mc-folder-name" type="text" formControlName="name" autocomplete="off" placeholder="np. Faktury 2026" />
              @if (folderFieldError(); as message) {
                <p class="mc-field-error">{{ message }}</p>
              }
            </div>
            <button type="submit" class="mc-btn" [disabled]="creatingFolder()">
              {{ creatingFolder() ? 'Tworzenie…' : 'Utwórz folder' }}
            </button>
          </form>
        }

        <div class="mc-list">
          @if (loading()) {
            <p class="mc-muted">Ładowanie zawartości…</p>
          } @else if (items().length === 0) {
            <p class="mc-muted">Ten folder jest pusty.</p>
          } @else {
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Nazwa</th>
                    <th class="mc-col-size">Rozmiar</th>
                    <th class="mc-col-date">Modyfikacja</th>
                    <th class="mc-col-actions">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  @for (entry of items(); track entry.name) {
                    <tr>
                      <td>
                        @if (entry.type === 'folder') {
                          <button type="button" class="entry-name is-folder" (click)="open(childPath(entry.name))">
                            <span class="entry-icon" aria-hidden="true">📁</span>
                            <span>{{ entry.name }}</span>
                          </button>
                        } @else {
                          <span class="entry-name">
                            <span class="entry-icon" aria-hidden="true">📄</span>
                            <span>{{ entry.name }}</span>
                          </span>
                        }
                      </td>
                      <td>{{ entry.type === 'folder' ? '—' : formatSize(entry.size) }}</td>
                      <td>{{ formatModified(entry.modified) }}</td>
                      <td>
                        <div class="actions-cell">
                          @if (entry.type === 'file') {
                            <button
                              type="button"
                              class="btn-secondary"
                              [disabled]="busyPath() === childPath(entry.name)"
                              (click)="download(entry)"
                            >⬇️ Pobierz</button>
                          }
                          <button
                            type="button"
                            class="btn-secondary btn-danger"
                            [disabled]="busyPath() === childPath(entry.name)"
                            (click)="remove(entry)"
                          >🗑 Usuń</button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      <footer class="mc-status">
        @if (activeUpload(); as current) {
          <span class="mc-progress is-inline">
            <span class="mc-progress-fill" [style.width.%]="current.progress"></span>
          </span>
          <span class="mc-status-text">Wgrywanie „{{ current.name }}" — {{ current.progress }}%</span>
        } @else {
          <span class="mc-status-text">Przeciągnij pliki do tego okna, aby je wgrać.</span>
        }
        <span class="mc-spacer"></span>
        @if (view() === 'drive') {
          <span class="mc-status-text">{{ items().length }} elem.</span>
        }
      </footer>

      @if (dragActive()) {
        <div class="mc-drop-overlay" aria-hidden="true">
          <span>⬆️ Upuść pliki, aby je wgrać</span>
        </div>
      }

      @if (uploadDialogOpen()) {
        <app-upload-dialog
          [items]="uploads()"
          [summary]="uploadSummary()"
          (added)="enqueue($event)"
          (closed)="closeUploadDialog()"
        />
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex: 1;
      min-height: 0;
    }

    .mc {
      position: relative;
      flex: 1;
      min-width: 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
      background: #fff;
    }

    .mc-drive-view {
      flex: 1;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }

    .mc-drive {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.6rem;
      padding: 1.25rem 1.75rem;
      border: 1px solid transparent;
      border-radius: 16px;
      background: transparent;
      font: inherit;
      color: var(--ink);
      cursor: pointer;
      transition: background 0.18s ease, border-color 0.18s ease;
    }

    .mc-drive:hover,
    .mc-drive:focus-visible {
      background: rgba(59, 91, 219, 0.08);
      border-color: rgba(59, 91, 219, 0.25);
      outline: none;
    }

    .mc-drive-art {
      font-size: 3.2rem;
      line-height: 1;
    }

    .mc-drive-label {
      font-weight: 700;
      font-size: 0.95rem;
    }

    .mc-toolbar {
      flex: 0 0 auto;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 0.75rem;
      border-bottom: 1px solid var(--line);
      background: rgba(59, 91, 219, 0.05);
    }

    .mc-spacer {
      flex: 1;
    }

    .mc-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.5rem 0.85rem;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: #fff;
      color: var(--ink);
      font: inherit;
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: none;
      letter-spacing: 0;
      cursor: pointer;
      transition: background 0.18s ease, border-color 0.18s ease;
    }

    .mc-btn:hover:not(:disabled) {
      background: rgba(59, 91, 219, 0.12);
      border-color: rgba(59, 91, 219, 0.3);
    }

    .mc-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .mc-icon-btn {
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--line);
      border-radius: 9px;
      background: #fff;
      color: var(--ink);
      font: inherit;
      font-size: 0.95rem;
      line-height: 1;
      cursor: pointer;
      transition: background 0.18s ease;
    }

    .mc-icon-btn:hover:not(:disabled) {
      background: rgba(59, 91, 219, 0.12);
    }

    .mc-icon-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .mc-crumbs {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.15rem;
      min-width: 0;
      font-weight: 600;
    }

    .mc-crumbs button {
      border: 0;
      background: transparent;
      padding: 0.2rem 0.4rem;
      border-radius: 8px;
      font: inherit;
      font-weight: 600;
      color: var(--accent-dark);
      cursor: pointer;
      white-space: nowrap;
    }

    .mc-crumbs button:hover {
      background: rgba(59, 91, 219, 0.12);
    }

    .mc-crumb-sep {
      color: var(--ink-muted);
    }

    .mc-folder-form {
      flex: 0 0 auto;
      display: flex;
      align-items: flex-end;
      gap: 0.75rem;
      padding: 0.9rem 0.9rem 0;
    }

    .mc-folder-form .form-group {
      flex: 1;
      margin: 0;
    }

    .mc-field-error {
      margin: 0.35rem 0 0;
      color: var(--danger);
      font-size: 0.88rem;
    }

    .mc .alert {
      flex: 0 0 auto;
      margin: 0.9rem 0.9rem 0;
    }

    .mc-list {
      flex: 1;
      min-height: 0;
      overflow: auto;
      padding: 0.9rem;
    }

    .mc-col-size {
      width: 110px;
    }

    .mc-col-date {
      width: 175px;
    }

    .mc-col-actions {
      width: 200px;
      text-align: right;
    }

    .mc-muted {
      color: var(--ink-muted);
      margin: 0.5rem 0;
    }

    .mc-status {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.45rem 0.75rem;
      border-top: 1px solid var(--line);
      background: rgba(27, 37, 64, 0.04);
    }

    .mc-status-text {
      font-size: 0.82rem;
      color: var(--ink-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mc-progress {
      display: block;
      position: relative;
      height: 8px;
      border-radius: 999px;
      background: rgba(27, 37, 64, 0.12);
      overflow: hidden;
    }

    .mc-progress.is-inline {
      flex: 0 0 140px;
    }

    .mc-progress-fill {
      display: block;
      height: 100%;
      width: 0;
      border-radius: 999px;
      background: linear-gradient(135deg, var(--accent), var(--accent-dark));
      transition: width 0.15s ease;
    }

    .mc-progress.is-done .mc-progress-fill {
      background: var(--ok);
    }

    .mc-progress.is-error .mc-progress-fill {
      background: var(--danger);
    }

    .mc-drop-overlay {
      position: absolute;
      inset: 0;
      z-index: 3;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      background: rgba(59, 91, 219, 0.16);
      border: 3px dashed var(--accent);
      border-radius: 14px;
      color: var(--accent-dark);
      font-weight: 700;
      font-size: 1.05rem;
    }
  `,
})
export class MyComputerComponent {
  private readonly files = inject(FilesService);
  private readonly fb = inject(FormBuilder);

  readonly view = signal<ComputerView>('computer');

  /** Ścieżka bieżącego katalogu (pusta = katalog główny użytkownika). */
  readonly path = signal('');
  readonly items = signal<FileEntry[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly busyPath = signal<string | null>(null);

  readonly folderFormOpen = signal(false);
  readonly creatingFolder = signal(false);
  readonly folderFormError = signal<ApiError | null>(null);

  readonly uploadDialogOpen = signal(false);
  readonly uploads = signal<UploadItem[]>([]);
  readonly dragActive = signal(false);

  readonly folderForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
  });

  /** Ścieżki i nazwy kolejnych segmentów bieżącej lokalizacji. */
  readonly crumbs = computed<{ name: string; path: string }[]>(() => {
    const current = this.path();
    if (current === '') {
      return [];
    }
    const segments = current.split('/');
    return segments.map((name, index) => ({
      name,
      path: segments.slice(0, index + 1).join('/'),
    }));
  });

  /** Pierwszy plik, który jest właśnie wysyłany (do paska w stopce). */
  readonly activeUpload = computed(() => this.uploads().find((item) => item.status === 'uploading') ?? null);

  readonly uploadSummary = computed(() => {
    const list = this.uploads();
    if (list.length === 0) {
      return '';
    }
    const done = list.filter((item) => item.status === 'done').length;
    const failed = list.filter((item) => item.status === 'error').length;
    const pending = list.length - done - failed;

    if (pending > 0) {
      return `Wgrywanie… ${done + failed}/${list.length}`;
    }
    return failed > 0 ? `Zakończono: ${done} wgranych, ${failed} z błędem` : `Wgrano pliki: ${done}`;
  });

  private nextUploadId = 1;

  openDrive(): void {
    this.load('');
  }

  open(path: string): void {
    this.load(path);
  }

  /** Wraca do katalogu nadrzędnego, a z katalogu głównego do widoku dysku. */
  back(): void {
    const current = this.path();
    if (current === '') {
      this.view.set('computer');
      return;
    }
    const segments = current.split('/');
    segments.pop();
    this.load(segments.join('/'));
  }

  reload(): void {
    this.load(this.path());
  }

  childPath(name: string): string {
    const base = this.path();
    return base === '' ? name : `${base}/${name}`;
  }

  formatSize(size: number | null): string {
    return formatBytes(size);
  }

  formatModified(iso: string): string {
    return formatDate(iso);
  }

  toggleFolderForm(): void {
    this.folderFormOpen.update((open) => !open);
    this.folderForm.reset({ name: '' });
    this.folderFormError.set(null);
  }

  folderFieldError(): string | null {
    return fieldError(this.folderFormError(), 'name');
  }

  createFolder(): void {
    if (this.creatingFolder()) {
      return;
    }

    this.folderForm.markAllAsTouched();
    if (this.folderForm.invalid) {
      return;
    }

    this.creatingFolder.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.folderFormError.set(null);

    this.files.createFolder(this.path(), this.folderForm.getRawValue().name.trim()).subscribe({
      next: () => {
        this.creatingFolder.set(false);
        this.folderFormOpen.set(false);
        this.folderForm.reset({ name: '' });
        this.notice.set('Folder został utworzony.');
        this.reload();
      },
      error: (err: unknown) => {
        this.creatingFolder.set(false);
        const apiError = toApiError(err);
        this.folderFormError.set(apiError);
        this.error.set(apiError.message);
      },
    });
  }

  openUploadDialog(): void {
    this.uploadDialogOpen.set(true);
  }

  closeUploadDialog(): void {
    this.uploadDialogOpen.set(false);
    this.uploads.set([]);
  }

  onDragOver(event: DragEvent): void {
    if (!this.hasFiles(event)) {
      return;
    }
    event.preventDefault();
    this.dragActive.set(true);
  }

  onDragLeave(event: DragEvent): void {
    const container = event.currentTarget as HTMLElement;
    if (!container.contains(event.relatedTarget as Node | null)) {
      this.dragActive.set(false);
    }
  }

  onDrop(event: DragEvent): void {
    if (!this.hasFiles(event)) {
      return;
    }
    event.preventDefault();
    this.dragActive.set(false);
    this.enqueue(Array.from(event.dataTransfer?.files ?? []));
  }

  download(entry: FileEntry): void {
    const path = this.childPath(entry.name);
    this.busyPath.set(path);
    this.error.set(null);
    this.notice.set(null);

    this.files.download(path).subscribe({
      next: (blob) => {
        this.saveBlob(blob, entry.name);
        this.busyPath.set(null);
      },
      error: (err: unknown) => {
        this.busyPath.set(null);
        this.error.set(toApiError(err).message);
      },
    });
  }

  remove(entry: FileEntry): void {
    const path = this.childPath(entry.name);
    const label = entry.type === 'folder' ? 'folder' : 'plik';
    if (!window.confirm(`Usunąć ${label} „${entry.name}"?`)) {
      return;
    }

    this.busyPath.set(path);
    this.error.set(null);
    this.notice.set(null);

    this.files.remove(path).subscribe({
      next: () => {
        this.busyPath.set(null);
        this.notice.set(entry.type === 'folder' ? 'Folder został usunięty.' : 'Plik został usunięty.');
        this.reload();
      },
      error: (err: unknown) => {
        this.busyPath.set(null);
        this.error.set(toApiError(err).message);
      },
    });
  }

  /** Czy przeciągane dane zawierają pliki (a nie np. zaznaczony tekst). */
  private hasFiles(event: DragEvent): boolean {
    return Array.from(event.dataTransfer?.types ?? []).includes('Files');
  }

  /**
   * Dodaje pliki do kolejki i wysyła je pojedynczo, aktualizując pasek postępu.
   * Błąd jednego pliku nie przerywa wysyłania pozostałych.
   */
  enqueue(files: File[]): void {
    if (files.length === 0) {
      return;
    }

    if (this.view() === 'computer') {
      this.view.set('drive');
      this.load('');
    }

    this.uploadDialogOpen.set(true);
    this.error.set(null);
    this.notice.set(null);

    const created: UploadItem[] = files.map((file) => ({
      id: this.nextUploadId++,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'uploading',
      error: null,
    }));
    this.uploads.update((list) => [...list, ...created]);

    const jobs = files.map((file, index) => ({ file, item: created[index] }));

    from(jobs)
      .pipe(
        concatMap(({ file, item }) =>
          this.files.uploadWithProgress(this.path(), file).pipe(
            tap((event) => {
              if (event.type === HttpEventType.UploadProgress) {
                const total = event.total ?? file.size;
                const progress = total > 0 ? Math.round((event.loaded / total) * 100) : 100;
                this.patchUpload(item.id, { progress });
              } else if (event.type === HttpEventType.Response) {
                this.patchUpload(item.id, { progress: 100, status: 'done' });
              }
            }),
            catchError((err: unknown) => {
              this.patchUpload(item.id, { status: 'error', error: toApiError(err).message });
              return of(null);
            }),
          ),
        ),
      )
      .subscribe({
        complete: () => {
          const failed = this.uploads().filter((item) => item.status === 'error').length;
          if (failed === 0) {
            this.notice.set(files.length === 1 ? 'Plik został wgrany.' : `Wgrano pliki: ${files.length}.`);
          }
          this.reload();
        },
      });
  }

  private patchUpload(id: number, patch: Partial<UploadItem>): void {
    this.uploads.update((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  private load(path: string): void {
    this.view.set('drive');
    this.loading.set(true);
    this.error.set(null);
    this.notice.set(null);

    this.files.list(path).subscribe({
      next: (listing) => {
        this.path.set(listing.path);
        this.items.set(listing.items);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(toApiError(err).message);
      },
    });
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
