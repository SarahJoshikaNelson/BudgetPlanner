export interface MonthlyData {
  month: number;
  year: number;
  income: number;
  expenses: number;
}

export interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
}

export interface FinancialEntry {
  id: string;
  date: Date;
  type: 'income' | 'expense';
  category: string;
  amount: number;
}

