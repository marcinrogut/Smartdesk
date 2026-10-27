import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type User = { id: number; username: string; role: 'admin' | 'user' };
type FileItem = { name: string; type: 'folder' | 'file'; size: number | null };

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly http = inject(HttpClient);
  protected readonly user = signal<User | null>(null);
  protected readonly view = signal<'desktop' | 'computer' | 'disk'>('desktop');
  protected readonly path = signal('');
  protected readonly files = signal<FileItem[]>([]);
  protected readonly error = signal('');
  protected readonly menuOpen = signal(false);
  protected username = 'admin'; protected password = 'admin';
  constructor() { this.http.get<{ user: User }>('/backend/?api=me', { withCredentials: true }).subscribe({ next: r => this.user.set(r.user), error: () => undefined }); }
  protected login(): void { this.error.set(''); this.http.post<{ user: User }>('/backend/?api=login', { username: this.username, password: this.password }, { withCredentials: true }).subscribe({ next: r => { this.user.set(r.user); this.view.set('desktop'); }, error: r => this.error.set(r.error?.error ?? 'Nie udało się zalogować.') }); }
  protected openComputer(): void { this.view.set('computer'); }
  protected toggleMenu(): void { this.menuOpen.update(open => !open); }
  protected openDisk(): void { this.path.set(''); this.view.set('disk'); this.loadFiles(); }
  protected openItem(item: FileItem): void { const itemPath = this.path() ? `${this.path()}/${item.name}` : item.name; if (item.type === 'folder') { this.path.set(itemPath); this.loadFiles(); return; } window.location.href = `/backend/?api=download&path=${encodeURIComponent(itemPath)}`; }
  protected goBack(): void { if (this.view() === 'disk' && this.path()) { this.path.set(this.path().split('/').slice(0, -1).join('/')); this.loadFiles(); return; } if (this.view() === 'disk') this.view.set('computer'); else if (this.view() === 'computer') this.view.set('desktop'); }
  protected logout(): void { this.http.post('/backend/?api=logout', {}, { withCredentials: true }).subscribe({ complete: () => this.reset() }); }
  protected displaySize(size: number | null): string { return size === null ? 'Folder' : `${Math.max(1, Math.ceil(size / 1024))} KB`; }
  private loadFiles(): void { this.http.get<{ items: FileItem[] }>(`/backend/?api=files&path=${encodeURIComponent(this.path())}`, { withCredentials: true }).subscribe({ next: r => this.files.set(r.items), error: () => this.reset() }); }
  private reset(): void { this.user.set(null); this.view.set('desktop'); this.path.set(''); this.files.set([]); this.menuOpen.set(false); }
}
