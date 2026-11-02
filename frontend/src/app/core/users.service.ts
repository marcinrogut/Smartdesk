import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { User, UserCreateInput } from './models';

/** Serwis użytkowników (tylko administrator). */
@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly api = inject(ApiService);

  list(): Observable<User[]> {
    return this.api.get<User[]>('/users/index.php');
  }

  create(input: UserCreateInput): Observable<User> {
    return this.api.post<User>('/users/create.php', input);
  }
}
