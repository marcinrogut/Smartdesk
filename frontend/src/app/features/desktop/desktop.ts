import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { concatMap, from } from 'rxjs';
import { FilesService } from '../../core/files.service';
import { FileEntry } from '../../core/models';
import { ApiError, fieldError, toApiError } from '../../core/api-error';
import { formatBytes, formatDate } from '../../shared/format';

/** Zarządza plikami i folderami zalogowanego użytkownika. */
@Component({
  selector: 'app-desktop',
  imports: [ReactiveFormsModule],
  template: `
    <section class="hero">
      <h1 class="hero-brand">🗂️ Mój dysk</h1>
      <p class="hero-lead">Foldery i pliki w Twojej prywatnej przestrzeni</p>
    </section>

    <section class="panel">
      @if (error(); as message) {
        <div class="alert alert-error" role="alert">{{ message }}</div>
      }
      @if (notice(); as message) {
        <div class="alert alert-success" role="status">{{ message }}</div>
      }

      <nav class="breadcrumb" aria-label="Ścieżka">
        <button type="button" (click)="open('')">🏠 Start</button>
        @for (crumb of crumbs(); track crumb.path) {
          <span class="crumb-sep" aria-hidden="true">/</span>
          <button type="button" (click)="open(crumb.path)">{{ crumb.name }}</button>
        }
      </nav>

      <div class="toolbar">
        <button type="button" class="btn-secondary btn-inline" (click)="toggleFolderForm()">
          {{ folderFormOpen() ? '✕ Anuluj' : '+ Nowy folder' }}
        </button>

        <label class="btn-secondary btn-inline">
          {{ uploading() ? '⬆️ Wgrywanie…' : '⬆️ Wgraj pliki' }}
          <input type="file" multiple class="visually-hidden" [disabled]="uploading()" (change)="onFilesSelected($event)" />
        </label>

        <span class="spacer"></span>

        <button type="button" class="btn-secondary btn-inline" [disabled]="loading()" (click)="reload()">
          🔄 Odśwież
        </button>
      </div>

      @if (folderFormOpen()) {
        <form [formGroup]="folderForm" (ngSubmit)="createFolder()" style="margin-bottom: 1.25rem;">
          <div class="toolbar" style="align-items: flex-end; margin: 0;">
            <div class="form-group" style="flex: 1; min-width: 200px; margin: 0;">
              <label class="field-label" for="folder-name">Nazwa folderu</label>
              <input id="folder-name" type="text" formControlName="name" autocomplete="off" placeholder="np. Faktury 2026" />
              @if (folderFieldError(); as message) {
                <p class="hint" style="color: var(--danger);">{{ message }}</p>
              }
            </div>
            <button type="submit" class="btn-secondary btn-inline" [disabled]="creatingFolder()">
              {{ creatingFolder() ? 'Tworzenie…' : 'Utwórz folder' }}
            </button>
          </div>
        </form>
      }

      @if (loading()) {
        <p class="loading">Ładowanie zawartości…</p>
      } @else if (items().length === 0) {
        <p class="empty-state">Ten folder jest pusty.</p>
      } @else {
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nazwa</th>
                <th style="width: 120px;">Rozmiar</th>
                <th style="width: 190px;">Modyfikacja</th>
                <th style="width: 200px; text-align: right;">Akcje</th>
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
    </section>
  `,
})
export class DesktopPage implements OnInit {
  private readonly files = inject(FilesService);
  private readonly fb = inject(FormBuilder);

  /** Ścieżka bieżącego katalogu (pusta = katalog główny użytkownika). */
  readonly path = signal('');
  readonly items = signal<FileEntry[]>([]);
  readonly loading = signal(true);
  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly busyPath = signal<string | null>(null);

  readonly folderFormOpen = signal(false);
  readonly creatingFolder = signal(false);
  readonly folderFormError = signal<ApiError | null>(null);

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

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.load(this.path());
  }

  open(path: string): void {
    this.load(path);
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

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files ?? []);
    input.value = '';

    if (selected.length === 0 || this.uploading()) {
      return;
    }

    this.uploading.set(true);
    this.error.set(null);
    this.notice.set(null);

    from(selected)
      .pipe(concatMap((file) => this.files.upload(this.path(), file)))
      .subscribe({
        next: () => undefined,
        error: (err: unknown) => {
          this.uploading.set(false);
          this.error.set(toApiError(err).message);
          this.reload();
        },
        complete: () => {
          this.uploading.set(false);
          this.notice.set(selected.length === 1 ? 'Plik został wgrany.' : `Wgrano pliki: ${selected.length}.`);
          this.reload();
        },
      });
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
    if (!window.confirm(`Usunąć ${label} „${entry.name}”?`)) {
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

  private load(path: string): void {
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
