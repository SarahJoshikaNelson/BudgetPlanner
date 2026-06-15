import { Component, OnDestroy, ElementRef, ViewChild, AfterViewInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { Chart, registerables } from 'chart.js';
import { FinanceService } from '../../services/financeService';

Chart.register(...registerables);

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_SHORT   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PIE_COLORS  = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
];
const WHITE_TOOLTIP = {
  backgroundColor: 'white', borderColor: '#e5e7eb', borderWidth: 1,
  titleColor: '#111827', bodyColor: '#374151', padding: 10,
};
const CHART_ANIMATION = { duration: 600, easing: 'easeInOutQuart' as const };

type YearlyView  = 'line' | 'bar' | 'area';
type MonthView   = 'donut' | 'grid' | 'list';
type TimeRange   = 'day' | 'week' | 'month' | 'year';

@Component({
  selector: 'app-financedashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './financedashboard.html',
  styleUrl: './financedashboard.css',
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms ease', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class FinanceDashboard implements AfterViewInit, OnDestroy {
  private financeService = inject(FinanceService);

  @ViewChild('yearlyChart')     yearlyChartRef!:     ElementRef<HTMLCanvasElement>;
  @ViewChild('pieChart')        pieChartRef!:        ElementRef<HTMLCanvasElement>;
  @ViewChild('comparisonChart') comparisonChartRef!: ElementRef<HTMLCanvasElement>;

  // ── DATE NAVIGATION ───────────────────────────────────────
  selectedYear  = signal(new Date().getFullYear());
  selectedMonth = signal(new Date().getMonth());
  selectedWeek  = signal(this.currentISOWeek());
  selectedDay   = signal(new Date());

  // ── COMPARISON PERIODS — each side has independent month + year ──
  month1Month = signal(0);
  month1Year  = signal(new Date().getFullYear());
  month2Month = signal(new Date().getMonth());
  month2Year  = signal(new Date().getFullYear());

  // ── VIEW MODE SIGNALS ─────────────────────────────────────
  yearlyView = signal<YearlyView>('line');
  monthView  = signal<MonthView>('donut');
  timeRange  = signal<TimeRange>('month');

  // ── STATIC DATA ───────────────────────────────────────────
  readonly monthNames    = MONTH_NAMES;
  readonly monthShort    = MONTH_SHORT;
  readonly pieColors     = PIE_COLORS;

  /** Dynamically computed list of years present in the data, plus current year */
  availableYears = computed(() => {
    const years = new Set<number>();
    this.financeService.entries().forEach(e => years.add(e.date.getFullYear()));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => a - b);
  });

  private charts = new Map<string, Chart>();

  // ── OVERVIEW DATA (reacts to timeRange) ───────────────────

  overviewChartData = computed(() => {
    const range  = this.timeRange();
    const all    = this.financeService.entries();

    if (range === 'year') {
      // one bar/point per year in the dataset
      const years = this.availableYears();
      const stats = years.map(y => {
        const e = all.filter(e => e.date.getFullYear() === y);
        return {
          label: String(y),
          income:   e.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0),
          expenses: e.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
        };
      });
      return { labels: stats.map(s => s.label), stats };
    }

    if (range === 'month') {
      // 12 months of selected year (existing behaviour)
      const year  = this.selectedYear();
      const stats = Array.from({ length: 12 }, (_, m) => {
        const e = all.filter(e => e.date.getFullYear() === year && e.date.getMonth() === m);
        return {
          label: MONTH_SHORT[m],
          income:   e.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0),
          expenses: e.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
        };
      });
      return { labels: stats.map(s => s.label), stats };
    }

    if (range === 'week') {
      // Mon–Sun of the selected ISO week
      const weekDays = this.daysOfWeek(this.selectedYear(), this.selectedWeek());
      const stats = weekDays.map(date => {
        const d = date.toDateString();
        const e = all.filter(e => e.date.toDateString() === d);
        return {
          label: DAY_SHORT[date.getDay() === 0 ? 6 : date.getDay() - 1],
          income:   e.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0),
          expenses: e.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
        };
      });
      return { labels: stats.map(s => s.label), stats };
    }

    // day — 24 hours
    const day = this.selectedDay();
    const dayStr = day.toDateString();
    const stats = Array.from({ length: 24 }, (_, h) => {
      const e = all.filter(e =>
        e.date.toDateString() === dayStr && e.date.getHours() === h
      );
      return {
        label: `${h}:00`,
        income:   e.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0),
        expenses: e.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
      };
    });
    return { labels: stats.map(s => s.label), stats };
  });

  // ── KPI SIGNALS (always based on selected year) ───────────
  yearlyFilteredData = computed(() => {
    const year = this.selectedYear();
    return this.financeService.entries().filter(e => e.date.getFullYear() === year);
  });

  monthlyStats = computed(() => {
    const data = this.yearlyFilteredData();
    return Array.from({ length: 12 }, (_, month) => {
      const entries  = data.filter(e => e.date.getMonth() === month);
      const income   = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
      const expenses = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
      return { month, income, expenses, savings: Math.max(0, income - expenses) };
    });
  });

  yearlyIncome   = computed(() => this.monthlyStats().reduce((s, d) => s + d.income,   0));
  yearlyExpenses = computed(() => this.monthlyStats().reduce((s, d) => s + d.expenses, 0));
  yearlyBalance  = computed(() => Math.max(0, this.yearlyIncome() - this.yearlyExpenses()));
  savingsRate    = computed(() => {
    const inc = this.yearlyIncome();
    return inc === 0 ? 0 : Math.round((this.yearlyBalance() / inc) * 100);
  });

  // ── MONTHLY BREAKDOWN ─────────────────────────────────────
  monthCategoryData = computed(() => {
    const month = this.selectedMonth();
    const data  = this.yearlyFilteredData().filter(e => e.date.getMonth() === month && e.type === 'expense');
    const map   = new Map<string, number>();
    data.forEach(e => map.set(e.category, (map.get(e.category) || 0) + e.amount));
    const total = Array.from(map.values()).reduce((s, v) => s + v, 0);
    return Array.from(map.entries())
      .map(([category, amount]) => ({
        category, amount,
        percentage: total > 0 ? (amount / total) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  });

  totalMonthExpenses = computed(() => this.monthCategoryData().reduce((s, c) => s + c.amount, 0));

  // ── COMPARISON DATA ───────────────────────────────────────
  comparisonData = computed(() => {
    const all    = this.financeService.entries();
    const filter = (m: number, y: number) => {
      const entries = all.filter(e => e.date.getFullYear() === y && e.date.getMonth() === m);
      return {
        income:   entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0),
        expenses: entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
      };
    };
    return {
      m1: filter(this.month1Month(), this.month1Year()),
      m2: filter(this.month2Month(), this.month2Year())
    };
  });

  comparisonDiff = computed(() => {
    const c = this.comparisonData();
    return { balance: (c.m2.income - c.m2.expenses) - (c.m1.income - c.m1.expenses) };
  });

  // ── OVERVIEW LABEL (shown in header) ─────────────────────
  overviewPeriodLabel = computed(() => {
    switch (this.timeRange()) {
      case 'year':  return 'All years';
      case 'month': return String(this.selectedYear());
      case 'week':  return `Week ${this.selectedWeek()}, ${this.selectedYear()}`;
      case 'day':   return this.selectedDay().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  });

  // ── LIFECYCLE & EFFECTS ───────────────────────────────────
  constructor() {
    effect(() => {
      this.overviewChartData();
      this.yearlyView();
      this.buildYearlyChart();
    });

    effect(() => {
      this.monthCategoryData();
      this.buildPieChart();
    });

    effect(() => {
      this.comparisonData();
      this.buildComparisonChart();
    });
  }

  ngAfterViewInit() { setTimeout(() => this.refreshAllCharts(), 100); }
  ngOnDestroy()     { this.charts.forEach(c => c.destroy()); }

  // ── NAVIGATION ────────────────────────────────────────────

  prevYear() { this.selectedYear.update(y => y - 1); }
  nextYear() { this.selectedYear.update(y => y + 1); }

  prevMonth() {
    if (this.selectedMonth() === 0) { this.selectedMonth.set(11); this.prevYear(); }
    else { this.selectedMonth.update(m => m - 1); }
  }
  nextMonth() {
    if (this.selectedMonth() === 11) { this.selectedMonth.set(0); this.nextYear(); }
    else { this.selectedMonth.update(m => m + 1); }
  }

  prevWeek() {
    if (this.selectedWeek() === 1) {
      this.selectedYear.update(y => y - 1);
      this.selectedWeek.set(this.weeksInYear(this.selectedYear()));
    } else { this.selectedWeek.update(w => w - 1); }
  }
  nextWeek() {
    const max = this.weeksInYear(this.selectedYear());
    if (this.selectedWeek() >= max) {
      this.selectedYear.update(y => y + 1);
      this.selectedWeek.set(1);
    } else { this.selectedWeek.update(w => w + 1); }
  }

  prevDay() { this.selectedDay.update(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; }); }
  nextDay() { this.selectedDay.update(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; }); }

  // ── COMPARISON YEAR NAVIGATION ────────────────────────────
  month1Prev()     { this.month1Month.update(m => m === 0  ? 11 : m - 1); }
  month1Next()     { this.month1Month.update(m => m === 11 ? 0  : m + 1); }
  month1PrevYear() { this.month1Year.update(y => y - 1); }
  month1NextYear() { this.month1Year.update(y => y + 1); }

  month2Prev()     { this.month2Month.update(m => m === 0  ? 11 : m - 1); }
  month2Next()     { this.month2Month.update(m => m === 11 ? 0  : m + 1); }
  month2PrevYear() { this.month2Year.update(y => y - 1); }
  month2NextYear() { this.month2Year.update(y => y + 1); }

  formatCurrency(v: number): string {
    return `${v.toLocaleString('en-GB')}€`;
  }

  // ── HELPERS ───────────────────────────────────────────────

  private currentISOWeek(): number {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  }

  private weeksInYear(year: number): number {
    const d = new Date(year, 11, 31);
    const week = this.isoWeekOfDate(d);
    return week === 1 ? this.isoWeekOfDate(new Date(year, 11, 24)) : week;
  }

  private isoWeekOfDate(date: Date): number {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  }

  private daysOfWeek(year: number, week: number): Date[] {
    const jan4 = new Date(year, 0, 4);
    const dayOfJan4 = (jan4.getDay() + 6) % 7;
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - dayOfJan4 + (week - 1) * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }

  // ── CHART BUILDERS ────────────────────────────────────────

  private refreshAllCharts() {
    this.buildYearlyChart();
    this.buildPieChart();
    this.buildComparisonChart();
  }

  private buildYearlyChart() {
    const ctx = this.yearlyChartRef?.nativeElement.getContext('2d');
    if (!ctx) return;
    this.destroyChart('yearly');

    const { labels, stats } = this.overviewChartData();
    const view   = this.yearlyView();
    const isBar  = view === 'bar';
    const isArea = view === 'area';

    this.charts.set('yearly', new Chart(ctx, {
      type: isBar ? 'bar' : 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Income',
            data: stats.map(s => s.income),
            borderColor: '#10b981',
            backgroundColor: isBar ? '#10b981cc' : isArea ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.05)',
            fill: isArea, tension: 0.4, borderWidth: 2,
          },
          {
            label: 'Expenses',
            data: stats.map(s => s.expenses),
            borderColor: '#ef4444',
            backgroundColor: isBar ? '#ef4444cc' : isArea ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.05)',
            fill: isArea, tension: 0.4, borderWidth: 2,
          },
          {
            label: 'Savings',
            data: stats.map(s => Math.max(0, s.income - s.expenses)),
            borderColor: '#8b5cf6',
            backgroundColor: isBar ? '#8b5cf6cc' : isArea ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.05)',
            fill: isArea, tension: 0.4, borderWidth: 2,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: WHITE_TOOLTIP },
        scales: {
          x: { ticks: { autoSkip: this.timeRange() === 'day', maxRotation: 45 } },
          y: { ticks: { callback: (v: any) => v + '€' } }
        },
        animation: CHART_ANIMATION
      }
    }));
  }

  private buildPieChart() {
    const ctx = this.pieChartRef?.nativeElement.getContext('2d');
    if (!ctx) return;
    this.destroyChart('pie');
    const data = this.monthCategoryData();
    this.charts.set('pie', new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.category),
        datasets: [{ data: data.map(d => d.amount), backgroundColor: PIE_COLORS, borderWidth: 2, hoverOffset: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: { legend: { display: false }, tooltip: WHITE_TOOLTIP },
        animation: CHART_ANIMATION
      }
    }));
  }

  private buildComparisonChart() {
    const ctx = this.comparisonChartRef?.nativeElement.getContext('2d');
    if (!ctx) return;
    this.destroyChart('comp');
    const c = this.comparisonData();
    const m1Label = `${MONTH_SHORT[this.month1Month()]} ${this.month1Year()}`;
    const m2Label = `${MONTH_SHORT[this.month2Month()]} ${this.month2Year()}`;
    this.charts.set('comp', new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Income', 'Expenses', 'Balance'],
        datasets: [
          { label: m1Label, data: [c.m1.income, c.m1.expenses, Math.max(0, c.m1.income - c.m1.expenses)], backgroundColor: '#94a3b8', borderRadius: 4 },
          { label: m2Label, data: [c.m2.income, c.m2.expenses, Math.max(0, c.m2.income - c.m2.expenses)], backgroundColor: '#3b82f6', borderRadius: 4 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { tooltip: WHITE_TOOLTIP },
        scales: { y: { ticks: { callback: (v: any) => v + '€' } } },
        animation: CHART_ANIMATION
      }
    }));
  }

  private destroyChart(key: string) {
    this.charts.get(key)?.destroy();
    this.charts.delete(key);
  }

  downloadPDF() { window.print(); }
}
