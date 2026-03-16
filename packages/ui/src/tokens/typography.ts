export const typeScale = {
  display:    { size: '2rem',      lineHeight: '1.2',  weight: 400, font: 'serif' },
  headingLg:  { size: '1.5rem',    lineHeight: '1.25', weight: 400, font: 'serif' },
  headingMd:  { size: '1.25rem',   lineHeight: '1.3',  weight: 400, font: 'serif' },
  headingSm:  { size: '1rem',      lineHeight: '1.4',  weight: 600, font: 'sans' },
  bodyLg:     { size: '1rem',      lineHeight: '1.5',  weight: 400, font: 'sans' },
  body:       { size: '0.875rem',  lineHeight: '1.5',  weight: 400, font: 'sans' },
  bodySm:     { size: '0.8125rem', lineHeight: '1.5',  weight: 400, font: 'sans' },
  caption:    { size: '0.6875rem', lineHeight: '1.4',  weight: 500, font: 'sans' },
  dataSm:     { size: '0.875rem',  lineHeight: '1.2',  weight: 500, font: 'mono' },
  dataMd:     { size: '1rem',      lineHeight: '1.2',  weight: 600, font: 'mono' },
  dataLg:     { size: '1.25rem',   lineHeight: '1.2',  weight: 700, font: 'mono' },
  dataXl:     { size: '1.5rem',    lineHeight: '1.2',  weight: 700, font: 'mono' },
} as const;

/** Minimum text size — nothing below 11px anywhere */
export const MIN_TEXT_SIZE = '0.6875rem'; // 11px
