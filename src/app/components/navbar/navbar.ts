import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-navbar',
  imports: [],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  @Input() collapsed = false;
  @Output() collapsedChange = new EventEmitter<boolean>();

  protected readonly navItems = [
    { label: 'Intro', href: '#intro', shortLabel: 'I' },
    { label: 'About', href: '#about', shortLabel: 'A' },
    { label: 'Skills', href: '#skills', shortLabel: 'S' },
    { label: 'Projects & Technologies', href: '#projects-technologies', shortLabel: 'P' },
    { label: 'Contact', href: '#contact', shortLabel: 'C' },
  ];

  protected toggleNavbar(): void {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }
}
