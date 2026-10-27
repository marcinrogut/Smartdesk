import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <section class="hero">
      <h1 class="hero-brand">SmartDesk</h1>
      <p class="hero-lead">Twoje pliki, foldery i dokumenty — dostępne z każdego miejsca.</p>
    </section>

    @if (isAuthenticated()) {
      <section class="panel center-narrow">
        <h2>Witaj ponownie!</h2>
        <p class="hint">Masz już aktywną sesję. Przejdź do swojego dysku.</p>
        <a class="btn-primary" routerLink="/desktop">Otwórz mój dysk</a>
      </section>
    } @else {
      <section class="panel center-narrow">
        <h2>Zaloguj się</h2>
        <p class="hint">Aby korzystać ze swojego dysku, zaloguj się na swoje konto.</p>
        <a class="btn-primary" routerLink="/login">Przejdź do logowania</a>
      </section>
    }

    <section class="panel">
      <div class="panel-head">
        <h2>Co znajdziesz w SmartDesk</h2>
      </div>

      <div class="feature-grid">
        <article class="feature-card">
          <h3>🗂️ Foldery</h3>
          <p>Twórz własną strukturę katalogów i porządkuj dokumenty po swojemu.</p>
        </article>
        <article class="feature-card">
          <h3>⬆️ Wgrywanie plików</h3>
          <p>Przesyłaj pliki bezpośrednio z przeglądarki i pobieraj je jednym kliknięciem.</p>
        </article>
        <article class="feature-card">
          <h3>🔒 Prywatność</h3>
          <p>Każde konto ma odseparowaną przestrzeń — nikt nie zobaczy Twoich plików.</p>
        </article>
      </div>
    </section>
  `,
})
export class HomePage {
  private readonly auth = inject(AuthService);

  readonly isAuthenticated = this.auth.isAuthenticated;
}
