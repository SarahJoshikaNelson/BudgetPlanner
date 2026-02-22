import { Component, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface MonthlyData {
  month: number;
  year: number;
  income: number;
  expenses: number;
}

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
}

interface FinancialEntry {
  id: string;
  date: Date;
  type: 'income' | 'expense';
  category: string;
  amount: number;
}

const INCOME_CATEGORIES = ['Gehalt', 'Freelance', 'Investitionen', 'Sonstiges'];
const EXPENSE_CATEGORIES = ['Wohnung', 'Essen', 'Transport', 'Gesundheit', 'Entertainment', 'Shopping', 'Nebenkosten', 'Bildung', 'Reisen', 'Sonstiges'];

const ALL_CATEGORIES = Array.from(new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]));

function generateMockData(): FinancialEntry[] {
  const entries: FinancialEntry[] = [];
  let id = 1;
  [2024, 2025, 2026].forEach(year => {
    for (let month = 0; month < 12; month++) {
      const incomeCount = Math.floor(Math.random() * 3) + 2;
      for (let i = 0; i < incomeCount; i++) {
        const category = INCOME_CATEGORIES[Math.floor(Math.random() * INCOME_CATEGORIES.length)];
        entries.push({
          id: `${id++}`,
          date: new Date(year, month, Math.floor(Math.random() * 28) + 1),
          type: 'income',
          category,
          amount: category === 'Gehalt' ? Math.floor(Math.random() * 2000) + 4000 : Math.floor(Math.random() * 1500) + 500,
        });
      }
      const expenseCount = Math.floor(Math.random() * 8) + 5;
      for (let i = 0; i < expenseCount; i++) {
        const category = EXPENSE_CATEGORIES[Math.floor(Math.random() * EXPENSE_CATEGORIES.length)];
        const amounts: Record<string, number> = {
          'Wohnung': Math.floor(Math.random() * 500) + 1200,
          'Essen': Math.floor(Math.random() * 200) + 100,
          'Transport': Math.floor(Math.random() * 150) + 50,
          'Gesundheit': Math.floor(Math.random() * 300) + 50,
          'Entertainment': Math.floor(Math.random() * 150) + 30,
          'Shopping': Math.floor(Math.random() * 250) + 50,
          'Nebenkosten': Math.floor(Math.random() * 150) + 80,
          'Bildung': Math.floor(Math.random() * 400) + 100,
          'Reisen': Math.floor(Math.random() * 800) + 200,
          'Sonstiges': Math.floor(Math.random() * 200) + 50,
        };
        entries.push({
          id: `${id++}`,
          date: new Date(year, month, Math.floor(Math.random() * 28) + 1),
          type: 'expense',
          category,
          amount: amounts[category] || 100,
        });
      }
    }
  });
  return entries;
}

const MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const MONTH_SHORT = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
const PIE_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#06b6d4','#84cc16'];

// Shared white tooltip style — spread into every chart's tooltip config
const WHITE_TOOLTIP = {
  backgroundColor: 'white',
  borderColor: '#e5e7eb',
  borderWidth: 1,
  titleColor: '#111827',
  bodyColor: '#374151',
  padding: 10,
};

@Component({
  selector: 'app-finanzuebersicht',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './finanzuebersicht.html',
  styleUrl: './finanzuebersicht.css',
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms ease', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class Finanzuebersicht implements AfterViewInit, OnDestroy {
  @ViewChild('yearlyChart') yearlyChartRef!: ElementRef;
  @ViewChild('monthDetailChart') monthDetailChartRef!: ElementRef;
  @ViewChild('categoryCompareChart') categoryCompareChartRef!: ElementRef;
  @ViewChild('pieChart') pieChartRef!: ElementRef;
  @ViewChild('comparisonChart') comparisonChartRef!: ElementRef;

  allData = generateMockData();
  availableYears = [2024, 2025, 2026];
  allCategories = ALL_CATEGORIES;

  selectedYear = 2026;
  selectedMonth = 4;
  selectedCategory = ALL_CATEGORIES[0];

  month1Month = 0;
  month1Year = 2026;
  month2Month = 4;
  month2Year = 2026;

  private charts: Map<string, Chart> = new Map();

  monthNames = MONTH_NAMES;
  monthShort = MONTH_SHORT;

  get monthlyData(): MonthlyData[] {
    return Array.from({ length: 12 }, (_, month) => {
      const entries = this.allData.filter(e =>
        e.date.getFullYear() === this.selectedYear && e.date.getMonth() === month
      );
      return {
        month, year: this.selectedYear,
        income: entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0),
        expenses: entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
      };
    });
  }

  get monthCategoryData(): CategoryData[] {
    const entries = this.allData.filter(e =>
      e.date.getFullYear() === this.selectedYear &&
      e.date.getMonth() === this.selectedMonth &&
      e.type === 'expense'
    );
    const map = new Map<string, number>();
    entries.forEach(e => map.set(e.category, (map.get(e.category) || 0) + e.amount));
    const total = Array.from(map.values()).reduce((s, v) => s + v, 0);
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount, percentage: total > 0 ? (amount / total) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }

  get topCategories(): CategoryData[] {
    return this.monthCategoryData.slice(0, 5);
  }

  get categoryCompareData(): { income: number; expenses: number } {
    const entries = this.allData.filter(e =>
      e.date.getFullYear() === this.selectedYear &&
      e.date.getMonth() === this.selectedMonth &&
      e.category === this.selectedCategory
    );
    return {
      income: entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0),
      expenses: entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
    };
  }

  get comparisonData() {
    const m1 = this.allData.filter(e => e.date.getFullYear() === this.month1Year && e.date.getMonth() === this.month1Month);
    const m2 = this.allData.filter(e => e.date.getFullYear() === this.month2Year && e.date.getMonth() === this.month2Month);
    return {
      month1Income: m1.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0),
      month1Expenses: m1.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
      month2Income: m2.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0),
      month2Expenses: m2.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
    };
  }

  get comparisonDiff() {
    const c = this.comparisonData;
    return {
      income: c.month2Income - c.month1Income,
      expenses: c.month2Expenses - c.month1Expenses,
      balance: (c.month2Income - c.month2Expenses) - (c.month1Income - c.month1Expenses),
    };
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.buildYearlyChart();
      this.buildMonthDetailChart();
      this.buildCategoryCompareChart();
      this.buildPieChart();
      this.buildComparisonChart();
    }, 100);
  }

  ngOnDestroy() {
    this.charts.forEach(c => c.destroy());
  }

  formatCurrency(v: number): string {
    return `${v.toLocaleString('de-DE')}€`;
  }

  prevYear() {
    const i = this.availableYears.indexOf(this.selectedYear);
    if (i < this.availableYears.length - 1) { this.selectedYear = this.availableYears[i + 1]; this.refreshAll(); }
  }
  nextYear() {
    const i = this.availableYears.indexOf(this.selectedYear);
    if (i > 0) { this.selectedYear = this.availableYears[i - 1]; this.refreshAll(); }
  }

  prevMonth() {
    if (this.selectedMonth === 0) { this.selectedMonth = 11; this.prevYear(); }
    else { this.selectedMonth--; }
    this.refreshMonthCharts();
  }
  nextMonth() {
    if (this.selectedMonth === 11) { this.selectedMonth = 0; this.nextYear(); }
    else { this.selectedMonth++; }
    this.refreshMonthCharts();
  }

  onCategoryChange() {
    this.buildCategoryCompareChart();
  }

  month1Prev() { if (this.month1Month === 0) { this.month1Month = 11; this.month1Year--; } else this.month1Month--; this.refreshComparisonChart(); }
  month1Next() { if (this.month1Month === 11) { this.month1Month = 0; this.month1Year++; } else this.month1Month++; this.refreshComparisonChart(); }
  month2Prev() { if (this.month2Month === 0) { this.month2Month = 11; this.month2Year--; } else this.month2Month--; this.refreshComparisonChart(); }
  month2Next() { if (this.month2Month === 11) { this.month2Month = 0; this.month2Year++; } else this.month2Month++; this.refreshComparisonChart(); }

  refreshAll() {
    this.buildYearlyChart();
    this.buildMonthDetailChart();
    this.buildCategoryCompareChart();
    this.buildPieChart();
  }

  refreshMonthCharts() {
    this.buildMonthDetailChart();
    this.buildCategoryCompareChart();
    this.buildPieChart();
  }

  refreshComparisonChart() {
    this.buildComparisonChart();
  }

  private destroyChart(key: string) {
    this.charts.get(key)?.destroy();
    this.charts.delete(key);
  }

  buildYearlyChart() {
    this.destroyChart('yearly');
    const ctx = this.yearlyChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const data = this.monthlyData;
    this.charts.set('yearly', new Chart(ctx, {
      type: 'line',
      data: {
        labels: MONTH_SHORT,
        datasets: [
          {
            label: 'Einnahmen',
            data: data.map(d => d.income),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6,
          },
          {
            label: 'Ausgaben',
            data: data.map(d => d.expenses),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239,68,68,0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            ...WHITE_TOOLTIP,
            mode: 'index',
            intersect: false,
            callbacks: {
              label: ctx => ` ${Number(ctx.raw).toLocaleString('de-DE')}€`
            }
          }
        },
        hover: { mode: 'index', intersect: false },
        scales: {
          x: { grid: { color: '#f0f0f0' } },
          y: {
            grid: { color: '#f0f0f0' },
            ticks: { callback: v => `${Number(v).toLocaleString('de-DE')}€` }
          }
        },
        animation: { duration: 600, easing: 'easeInOutQuart' },
      }
    }));
  }

  buildMonthDetailChart() {
    this.destroyChart('monthDetail');
    const ctx = this.monthDetailChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const cats = this.topCategories;
    this.charts.set('monthDetail', new Chart(ctx, {
      type: 'bar',
      data: {
        labels: cats.map(c => c.category),
        datasets: [{
          label: 'Betrag',
          data: cats.map(c => c.amount),
          backgroundColor: '#3b82f6',
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...WHITE_TOOLTIP,
            callbacks: { label: ctx => ` ${Number(ctx.raw).toLocaleString('de-DE')}€` }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 45, font: { family: "'DM Sans', sans-serif", size: 12 } } },
          y: { grid: { color: '#f0f0f0' }, ticks: { callback: v => `${Number(v).toLocaleString('de-DE')}€`, font: { family: "'DM Sans', sans-serif", size: 12 } } }
        }
      }
    }));
  }

  buildCategoryCompareChart() {
    this.destroyChart('catCompare');
    const ctx = this.categoryCompareChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const { income, expenses } = this.categoryCompareData;
    this.charts.set('catCompare', new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Einnahmen', 'Ausgaben'],
        datasets: [{
          label: this.selectedCategory,
          data: [income, expenses],
          backgroundColor: ['#10b981', '#ef4444'],
          borderRadius: 6,
          barThickness: 60,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...WHITE_TOOLTIP,
            callbacks: {
              label: ctx => ` ${Number(ctx.raw).toLocaleString('de-DE')}€`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: "'DM Sans', sans-serif", size: 13, weight: 500 } }
          },
          y: {
            grid: { color: '#f0f0f0' },
            beginAtZero: true,
            ticks: {
              callback: v => `${Number(v).toLocaleString('de-DE')}€`,
              font: { family: "'DM Sans', sans-serif", size: 12 }
            }
          }
        },
        animation: { duration: 400, easing: 'easeInOutQuart' },
      }
    }));
  }

  buildPieChart() {
    this.destroyChart('pie');
    const ctx = this.pieChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const cats = this.monthCategoryData;
    if (!cats.length) return;
    this.charts.set('pie', new Chart(ctx, {
      type: 'pie',
      data: {
        labels: cats.map(c => c.category),
        datasets: [{
          data: cats.map(c => c.amount),
          backgroundColor: PIE_COLORS,
          borderWidth: 2,
          borderColor: '#fff',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, font: { family: "'DM Sans', sans-serif" } } },
          tooltip: {
            ...WHITE_TOOLTIP,
            callbacks: {
              label: ctx => ` ${Number(ctx.raw).toLocaleString('de-DE')}€ (${cats[ctx.dataIndex]?.percentage.toFixed(1)}%)`
            }
          }
        }
      }
    }));
  }

  buildComparisonChart() {
    this.destroyChart('comparison');
    const ctx = this.comparisonChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;
    const c = this.comparisonData;
    this.charts.set('comparison', new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [
          `${MONTH_NAMES[this.month1Month]} ${this.month1Year}`,
          `${MONTH_NAMES[this.month2Month]} ${this.month2Year}`,
        ],
        datasets: [
          { label: 'Einnahmen', data: [c.month1Income, c.month2Income], backgroundColor: '#10b981', borderRadius: 4 },
          { label: 'Ausgaben', data: [c.month1Expenses, c.month2Expenses], backgroundColor: '#ef4444', borderRadius: 4 },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { family: "'DM Sans', sans-serif" } } },
          tooltip: {
            ...WHITE_TOOLTIP,
            callbacks: { label: ctx => ` ${Number(ctx.raw).toLocaleString('de-DE')}€` }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: "'DM Sans', sans-serif" } } },
          y: { grid: { color: '#f0f0f0' }, ticks: { callback: v => `${Number(v).toLocaleString('de-DE')}€`, font: { family: "'DM Sans', sans-serif" } } }
        }
      }
    }));
  }
}