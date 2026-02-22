import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Theme } from '../theme';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css'
})
export class NavBar {
  constructor(public theme: Theme) {}

  @HostListener('window:scroll')
  onScroll() {
    const navbar = document.querySelector('nav') as HTMLElement;
    if (!navbar) return;
    const s = window.scrollY;
    const blur = Math.min(s / 70, 20);
    const bg = Math.min(0.45 + s / 500, 0.78);
    const bord = Math.min(s / 250, 0.14);
    navbar.style.backdropFilter = `blur(${blur}px)`;
    (navbar.style as any)['webkitBackdropFilter'] = `blur(${blur}px)`;
    navbar.style.background = this.theme.isLight()
      ? `rgba(200, 170, 255, ${bg})`
      : `rgba(42, 18, 82, ${bg})`;
    navbar.style.borderBottomColor = `rgba(0,0,0,${bord})`;
  }
}