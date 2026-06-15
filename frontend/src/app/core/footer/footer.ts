import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css'
})
export class Footer {
  team = [
    { name: 'Sarah Joshika Nelson',   initials: 'SJN', color: '#4f4278' },
    { name: 'Petra Simunovic',   initials: 'PS', color: '#3b5c52' },
    { name: 'Franzsika Katzlberger', initials: 'FK', color: '#5c3b4e' },
    { name: 'Huy Tran',    initials: 'HT', color: '#5c4a3b' },
  ];

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}