import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBar } from './core/nav-bar/nav-bar';
import { LightDarkMode } from "./core/LightDarkMode/lightDarkMode";
import { Footer } from './core/footer/footer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavBar, LightDarkMode, Footer ],
  templateUrl: './app.html',
})
export class App {}