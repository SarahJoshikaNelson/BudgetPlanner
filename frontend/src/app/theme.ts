import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class Theme {
  // Initialize based on saved preference or default to false (dark)
  isLight = signal(localStorage.getItem('theme') === 'light');

  constructor() {
    // Apply the saved or default theme on startup
    this.applyTheme(this.isLight() ? 'light' : 'dark');
  }

  toggle() {
    this.isLight.update(v => !v);
    const themeName = this.isLight() ? 'light' : 'dark';
    this.applyTheme(themeName);
    localStorage.setItem('theme', themeName); // Save for next visit
  }

  private applyTheme(theme: 'light' | 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
  }
}