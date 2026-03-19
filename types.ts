
export enum AppMode {
  DASHBOARD = 'dashboard',
  COLORING_LAB = 'coloring_lab',
  HIDDEN_OBJECTS = 'hidden_objects'
}

export enum WorksheetLayout {
  FULL_PAGE = 'full_page',
  HALF_SHEET_CUT = 'half_sheet_cut',
  TRI_FOLD = 'tri_fold'
}

export enum PaperSize {
  A3 = 'A3',
  A4 = 'A4',
  A5 = 'A5',
  A6 = 'A6'
}

export enum BookFont {
  HANDWRITTEN = 'font-handwritten',
  PATRICK = 'font-patrick',
  COMING_SOON = 'font-coming-soon',
  MARKER = 'font-marker',
  CLASSIC = 'font-playfair',
  SANS = 'font-inter',
  SERIF = 'font-serif',
  SCHOOL = 'font-school',
  GOCHI = 'font-gochi',
  KHMER = 'font-khmer',
  KHMER_HAND = 'font-khmer-hand',
  TRACING = 'font-tracing',
  CAVEAT = 'font-caveat'
}

export interface TracingItem {
  id: string;
  text: string;
  repeatCount: number;
  fontStyle?: BookFont;
}

export interface ColoringCard {
  id: string;
  imageUrl?: string;
  imageUrls?: string[]; // Support for multiple images
  tracingItems: TracingItem[];
  paperSize: PaperSize;
  layout: WorksheetLayout;
  teacherName?: string;
  date?: string;
  parentSignature?: boolean;
  hasStars?: boolean;
  lineThickness: number;
  elementSpacing: number;
  tracingSpacing: number;
  frameStyle?: 'none' | 'bubbles' | 'stars' | 'leaves' | 'classic' | 'random';
}
