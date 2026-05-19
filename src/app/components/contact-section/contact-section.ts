import { Component, HostBinding, Input } from '@angular/core';

@Component({
  selector: 'app-contact-section',
  imports: [],
  templateUrl: './contact-section.html',
  styleUrl: './contact-section.scss',
})
export class ContactSection {
  @Input() scrollProgress = 0;

  @HostBinding('style.--contact-content-opacity')
  protected get contentOpacity(): string {
    return this.smoothstep((this.contactProgress - 0.26) / 0.5).toFixed(3);
  }

  @HostBinding('style.--contact-content-scale')
  protected get contentScale(): string {
    return this.lerp(0.72, 1, this.contactProgress).toFixed(3);
  }

  @HostBinding('style.--contact-content-x')
  protected get contentX(): string {
    return `${this.lerp(-18, 0, this.contactProgress).toFixed(2)}vw`;
  }

  @HostBinding('style.--contact-content-y')
  protected get contentY(): string {
    return `${this.lerp(-100, 0, this.contactProgress).toFixed(2)}vh`;
  }

  private get contactProgress(): number {
    return this.smoothstep(Math.min(Math.max(this.scrollProgress - 3, 0), 1));
  }

  private lerp(start: number, end: number, amount: number): number {
    return start + (end - start) * amount;
  }

  private smoothstep(value: number): number {
    const clamped = Math.min(Math.max(value, 0), 1);

    return clamped * clamped * (3 - 2 * clamped);
  }
}
