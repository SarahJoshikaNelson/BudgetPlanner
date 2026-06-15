export type NoteCategory =
  | 'Contracts'
  | 'Invoices'
  | 'Ideas'
  | 'Savings Plans'
  | 'Personal'
  | 'Work';

export type SortField = 'title' | 'createdAt' | 'updatedAt';
export type SortDir   = 'asc' | 'desc';
export type NoteView  = 'list' | 'detail';

export interface Note {
  id:          string;
  title:       string;
  content:     string;
  category:    NoteCategory;
  createdAt:   Date;
  updatedAt:   Date;
  isFavorite?: boolean;
}

export interface NoteFilter {
  searchQuery: string;
  sortField:   SortField;
  sortDir:     SortDir;
}

export const CATEGORIES: NoteCategory[] = [
  'Contracts', 'Invoices', 'Ideas', 'Savings Plans', 'Personal', 'Work',
];

export interface FormatButton {
  command: string;
  value?:  string;
  icon:    string;
  title:   string;
}

export const FORMAT_BUTTONS: FormatButton[] = [
  { command: 'bold',                icon: 'B',  title: 'Bold'        },
  { command: 'italic',              icon: 'I',  title: 'Italic'      },
  { command: 'underline',           icon: 'U',  title: 'Underline'   },
  { command: 'formatBlock', value: 'h1', icon: 'H1', title: 'Heading 1' },
  { command: 'formatBlock', value: 'h2', icon: 'H2', title: 'Heading 2' },
  { command: 'insertUnorderedList', icon: '≡',  title: 'Bullet list' },
  { command: 'insertOrderedList',   icon: '≡1', title: 'Numbered list' },
];