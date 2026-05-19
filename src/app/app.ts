import { Component, signal } from '@angular/core';
import { AboutSection } from './components/about-section/about-section';
import { ContactSection } from './components/contact-section/contact-section';
import { IntroSection } from './components/intro-section/intro-section';
import { Navbar } from './components/navbar/navbar';
import { PcOutlineScene } from './components/pc-outline-scene/pc-outline-scene';
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
    PcOutlineScene,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly isNavbarCollapsed = signal(true);
  protected readonly isDarkTheme = signal(false);
  protected readonly sectionProgress = signal(0);

  protected setNavbarCollapsed(isCollapsed: boolean): void {
    this.isNavbarCollapsed.set(isCollapsed);
  }

  protected setDarkTheme(isDarkTheme: boolean): void {
    this.isDarkTheme.set(isDarkTheme);
  }

  protected updateSectionProgress(event: Event): void {
    const scrollContainer = event.currentTarget as HTMLElement | null;

    if (!scrollContainer) {
      return;
    }

    const viewportHeight = Math.max(scrollContainer.clientHeight, 1);
    const maxProgress = Math.max(scrollContainer.children.length - 1, 0);
    const nextProgress = Math.min(
      maxProgress,
      Math.max(0, scrollContainer.scrollTop / viewportHeight),
    );

    this.sectionProgress.set(nextProgress);
  }
}
