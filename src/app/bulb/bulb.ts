import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Theme } from '../theme';

@Component({
  selector: 'app-bulb',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bulb.html',
  styleUrl: './bulb.css'
})
export class Bulb {
  constructor(public theme: Theme) {}

  get isOn() { return this.theme.isLight(); }

  toggle() { this.theme.toggle(); }
}