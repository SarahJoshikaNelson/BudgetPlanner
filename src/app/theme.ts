import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class Theme {
  isLight = signal(true);

  constructor() {
    // set theme on startup
    document.documentElement.setAttribute('data-theme', 'light');
  }

  toggle() {
    this.isLight.update(v => !v);
    document.documentElement.setAttribute('data-theme', this.isLight() ? 'light' : 'dark');
  }
}