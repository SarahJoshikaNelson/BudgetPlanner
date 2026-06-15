import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [ RouterLink ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {

  ngOnInit(): void {
    this.initScrollReveal();
    this.initTimeline();
  }

  private initScrollReveal(): void {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    document.querySelectorAll('.scroll-reveal').forEach((el) => {
      observer.observe(el);
    });
  }

  private initTimeline(): void {
    const lineObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            lineObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05 }
    );

    const fill = document.getElementById('timelineFill');
    if (fill) lineObserver.observe(fill);

    const itemObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const dot = entry.target.querySelector('[data-timeline-dot]') as HTMLElement;
            const card = entry.target.querySelector('[data-timeline-card]') as HTMLElement;

            if (dot) setTimeout(() => dot.classList.add('is-visible'), 100);
            if (card) setTimeout(() => card.classList.add('is-visible'), 300);

            itemObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    document.querySelectorAll('.timeline-item').forEach((el) => itemObserver.observe(el));
  }
}