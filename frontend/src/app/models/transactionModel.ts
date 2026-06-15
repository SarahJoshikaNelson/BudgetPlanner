export interface Transaction {
  id: number | string;
  name: string;
  date: string;       // stored as DD.MM.YYYY
  amount: number;
  tags: string[];
  type: 'income' | 'expense';
}

export interface TagDef {
  name: string;
  color: string;      // CSS class key, e.g. 'tag-green'
}

export interface CsvRow {
  name: string;
  date: string;
  amount: string; 
  tag: string;        // Spalte 4 für die Tags wieder da
  type: 'income' | 'expense';
}