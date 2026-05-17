import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';

@Component({
  selector: 'app-root',
  imports: [Navbar, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly isNavbarCollapsed = signal(true);

  protected setNavbarCollapsed(isCollapsed: boolean): void {
    this.isNavbarCollapsed.set(isCollapsed);
  }
}
