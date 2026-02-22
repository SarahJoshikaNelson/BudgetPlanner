import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ein-ausgaben',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './piggy-bank.html',
  styleUrl: './piggy-bank.css',
})
export class PiggyBankComponent implements OnInit {
  displayed = '';
  fullText = 'Eingaben und Ausgaben';

  ngOnInit() {
    let i = 0;
    const interval = setInterval(() => {
      this.displayed += this.fullText[i];
      i++;
      if (i === this.fullText.length) clearInterval(interval);
    }, 100);
  }
}