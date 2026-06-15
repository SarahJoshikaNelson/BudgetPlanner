export interface SavingsGoal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  autoSave: boolean;
  monthlyRate?: number;
  targetDate?: string;
  colorClass: string;
  deposits: { date: string; amount: number }[];
}

export interface FormErrors {
  name?: string;
  targetAmount?: string;
  monthlyRate?: string;
}