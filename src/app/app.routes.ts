import { Routes } from '@angular/router';

import { EinAusgaben } from './pages/ein-ausgaben/ein-ausgaben';
import { Home } from './pages/home/home';
import { Finanzuebersicht } from './pages/finanzuebersicht/finanzuebersicht';
import { Sparziele } from './pages/sparziele/sparziele';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'ausgaben', component: EinAusgaben },
  { path: 'finanzuebersicht', component: Finanzuebersicht },
  { path: 'sparziele', component: Sparziele }, 
];