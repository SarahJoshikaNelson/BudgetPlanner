import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-financial-tips',
  templateUrl: './financialTips.html',
  imports: [CommonModule],
  styleUrls: ['./financialTips.css']
})
export class FinancialTipsComponent implements OnInit, OnDestroy {
  tips = [
    {
      title: 'Build an Emergency Fund',
      text: 'Save 3–6 months of salary as a safety buffer for unexpected expenses.'
    },
    {
      title: '50-30-20 Rule',
      text: '50% fixed costs, 30% wants, 20% savings or investments.'
    },
    {
      title: 'Save Automatically',
      text: 'Set up a standing order right after your salary arrives.'
    },
    {
      title: 'Small Amounts Count',
      text: 'Saving regularly is more important than the size of individual amounts.'
    },
    {
      title: 'Visualize Your Goals',
      text: 'Concrete savings goals significantly increase your motivation.'
    }
  ];

  currentIndex = 0;
  intervalId: any;

  ngOnInit() {
    this.startAutoSlide();
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.tips.length;
  }

  prev() {
    this.currentIndex = (this.currentIndex - 1 + this.tips.length) % this.tips.length;
  }

  startAutoSlide() {
    this.intervalId = setInterval(() => {
      this.next();
    }, 4000);
  }

  pauseAutoSlide() {
    clearInterval(this.intervalId);
  }

  resumeAutoSlide() {
    this.startAutoSlide();
  }
}