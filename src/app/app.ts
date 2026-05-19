import { Component, signal } from '@angular/core';
import { AboutSection } from './components/about-section/about-section';
import { ContactSection } from './components/contact-section/contact-section';
import { IntroSection } from './components/intro-section/intro-section';
import { Navbar } from './components/navbar/navbar';
import { ProjectsTechnologiesSection } from './components/projects-technologies-section/projects-technologies-section';
import { SkillsSection } from './components/skills-section/skills-section';

@Component({
  selector: 'app-root',
  imports: [
    Navbar,
    IntroSection,
    AboutSection,
    SkillsSection,
    ProjectsTechnologiesSection,
    ContactSection,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly isNavbarCollapsed = signal(true);
  protected readonly isDarkTheme = signal(false);

  protected setNavbarCollapsed(isCollapsed: boolean): void {
    this.isNavbarCollapsed.set(isCollapsed);
  }

  protected setDarkTheme(isDarkTheme: boolean): void {
    this.isDarkTheme.set(isDarkTheme);
  }
}
