import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Theme } from '../../theme';

@Component({
  selector: 'app-bulb',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lightDarkMode.html',
  styleUrl: './lightDarkMode.css'
})
export class LightDarkMode {
  // Injecting the service as 'public' so the HTML can see it directly
  constructor(public theme: Theme) {}

  toggle() {
    this.theme.toggle();
  }
}