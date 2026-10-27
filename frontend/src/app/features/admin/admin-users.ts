import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsersService } from '../../core/users.service';
import { User, UserCreateInput, UserRole } from '../../core/models';
import { ApiError, fieldError, toApiError } from '../../core/api-error';

@Component({
  selector: 'app-admin-users',
  imports: [ReactiveFormsModule],
  template: `
    <section class="panel">
      @if (error(); as message) {
        <div class="alert alert-error" role="alert">{{ message }}</div>
      }
      @if (notice(); as message) {
        <div class="alert alert-success" role="status">{{ message }}</div>
      }

      <div class="panel-head">
        <h2>Użytkownicy</h2>
        <div class="toolbar" style="margin: 0;">
          <button type="button" class="btn-secondary btn-inline" [disabled]="loading()" (click)="load()">
            🔄 Odśwież
          </button>
          <button type="button" class="btn-secondary btn-inline" (click)="toggleForm()">
            {{ formOpen() ? '✕ Zamknij formularz' : '+ Dodaj użytkownika' }}
          </button>
        </div>
      </div>

      @if (formOpen()) {
        <div class="alert alert-info">
          W systemie może istnieć tylko jeden aktywny administrator — utworzenie nowego konta admin
          automatycznie wyłączy poprzednie konto administratora.
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" style="margin-bottom: 1.5rem;">
          @if (formError(); as message) {
            <div class="alert alert-error" role="alert">{{ message }}</div>
          }

          <div class="form-group">
            <label class="field-label" for="new-username">Login</label>
            <input id="new-username" type="text" formControlName="username" autocomplete="off" />
            @if (formFieldError('username'); as message) {
              <p class="hint" style="color: var(--danger);">{{ message }}</p>
            }
          </div>

          <div class="form-group">
            <label class="field-label" for="new-password">Hasło (min. 4 znaki)</label>
            <input id="new-password" type="password" formControlName="password" autocomplete="new-password" />
            @if (formFieldError('password'); as message) {
              <p class="hint" style="color: var(--danger);">{{ message }}</p>
            }
          </div>

          <div class="form-group">
            <label class="field-label" for="new-role">Rola</label>
            <select id="new-role" formControlName="role">
              <option value="user">Użytkownik</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div class="actions-cell">
            <button type="button" class="btn-secondary" [disabled]="saving()" (click)="toggleForm()">Anuluj</button>
            <button type="submit" class="btn-secondary" [disabled]="saving()">
              {{ saving() ? 'Zapisywanie…' : 'Utwórz konto' }}
            </button>
          </div>
        </form>
      }

      @if (loading()) {
        <p class="loading">Ładowanie użytkowników…</p>
      } @else if (users().length === 0) {
        <p class="empty-state">Brak użytkowników.</p>
      } @else {
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Login</th>
                <th>Rola</th>
                <th>Status konta</th>
              </tr>
            </thead>
            <tbody>
              @for (user of users(); track user.id) {
                <tr>
                  <td style="font-weight: 600;">{{ user.username }}</td>
                  <td>
                    <span class="tag" [class.is-admin]="user.role === 'admin'">
                      {{ user.role === 'admin' ? 'Administrator' : 'Użytkownik' }}
                    </span>
                  </td>
                  <td>
                    @if (user.enabled) {
                      <span class="tag">Aktywne</span>
                    } @else {
                      <span class="tag is-disabled">Wyłączone</span>
                    }
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
export class AdminUsersPage implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly fb = inject(FormBuilder);

  readonly users = signal<User[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  readonly formOpen = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly formApiError = signal<ApiError | null>(null);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(4)]],
    role: this.fb.nonNullable.control<UserRole>('user'),
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.usersService.list().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(toApiError(err).message);
      },
    });
  }

  toggleForm(): void {
    this.formOpen.update((open) => !open);
    this.resetFormMessages();
  }

  submit(): void {
    if (this.saving()) {
      return;
    }

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const raw = this.form.getRawValue();
    const payload: UserCreateInput = {
      username: raw.username.trim(),
      password: raw.password,
      role: raw.role,
    };

    this.saving.set(true);
    this.resetFormMessages();

    this.usersService.create(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.form.reset({ username: '', password: '', role: 'user' });
        this.error.set(null);
        this.notice.set('Konto zostało utworzone.');
        this.load();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const apiError = toApiError(err);
        this.formApiError.set(apiError);
        this.formError.set(apiError.message);
      },
    });
  }

  formFieldError(field: string): string | null {
    return fieldError(this.formApiError(), field);
  }

  private resetFormMessages(): void {
    this.formError.set(null);
    this.formApiError.set(null);
  }
}
