import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBar } from './nav-bar/nav-bar';
import { Background } from './background/background';
import { Bulb } from "./bulb/bulb";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavBar, Background, Bulb],
  templateUrl: './app.html',
})
export class App {}