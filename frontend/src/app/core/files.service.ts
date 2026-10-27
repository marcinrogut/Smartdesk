import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from './api-config';
import { ApiService } from './api.service';
import { DirectoryListing, UploadResult } from './models';

/** Serwis plików: listowanie, foldery, wysyłka, usuwanie i pobieranie. */
@Injectable({ providedIn: 'root' })
export class FilesService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);

  /** Zawartość katalogu; `path` pusty = katalog domowy użytkownika. */
  list(path: string): Observable<DirectoryListing> {
    return this.api.get<DirectoryListing>('/files/index.php', { path });
  }

  createFolder(path: string, name: string): Observable<null> {
    return this.api.post<null>('/files/folder.php', { path, name });
  }

  upload(path: string, file: File): Observable<UploadResult> {
    const body = new FormData();
    body.append('path', path);
    body.append('file', file, file.name);

    return this.api.post<UploadResult>('/files/upload.php', body);
  }

  remove(path: string): Observable<null> {
    return this.api.post<null>('/files/delete.php', { path });
  }

  /** Pobiera plik jako blob (nagłówek Bearer dokłada interceptor). */
  download(path: string): Observable<Blob> {
    return this.http.get(API_BASE + '/files/download.php', {
      params: { path },
      responseType: 'blob',
    });
  }
}
