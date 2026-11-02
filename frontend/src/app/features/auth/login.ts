import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { toApiError } from '../../core/api-error';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  template: `
    <section class="hero">
      <h1 class="hero-brand">Logowanie</h1>
      <p class="hero-lead">Zaloguj się, aby uzyskać dostęp do swojego dysku</p>
    </section>

    <section class="panel center-narrow">
      @if (error(); as message) {
        <div class="alert alert-error" role="alert">{{ message }}</div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="form-group">
          <label class="field-label" for="username">Login</label>
          <input
            id="username"
            type="text"
            formControlName="username"
            placeholder="np. jan.kowalski"
            autocomplete="username"
          />
        </div>

        <div class="form-group">
          <label class="field-label" for="password">Hasło</label>
          <input id="password" type="password" formControlName="password" autocomplete="current-password" />
        </div>

        <button type="submit" class="btn-primary" [disabled]="loading()">
          {{ loading() ? 'Logowanie…' : 'Zaloguj się' }}
        </button>
      </form>
    </section>
  `,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    const { username, password } = this.form.getRawValue();

    this.auth.login(username, password).subscribe({
      next: () => {
        const redirect = this.route.snapshot.queryParamMap.get('redirect');
        void this.router.navigateByUrl(redirect && redirect.startsWith('/') ? redirect : '/desktop');
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(toApiError(err).message);
      },
    });
  }
}
