/**
 * Data source type definitions for node inputs/outputs.
 * Each type describes what fields are required and how to render them.
 */

export const DATA_SOURCE_TYPES = [
  {
    id:    'file',
    label: 'File',
    icon:  '📄',
    fields: ['path'],
    usePicker: 'file',
    placeholder: '/path/to/data.csv',
    note: 'Any file type: CSV, JSON, TXT, PDF, etc.',
  },
  {
    id:    'folder',
    label: 'Folder',
    icon:  '📁',
    fields: ['path'],
    usePicker: 'folder',
    placeholder: '/path/to/directory/',
    note: 'A directory — the node will process all files within it.',
  },
  {
    id:    'spreadsheet',
    label: 'Spreadsheet',
    icon:  '📊',
    fields: ['path', 'sheet'],
    usePicker: 'file',
    placeholder: '/path/to/workbook.xlsx',
    note: 'Excel (.xlsx) or Google Sheets export. Optionally specify a sheet name.',
  },
  {
    id:    'url',
    label: 'URL / API',
    icon:  '🌐',
    fields: ['url'],
    usePicker: null,
    placeholder: 'https://api.example.com/data',
    note: 'A remote endpoint — REST API, webhook, or public dataset URL.',
  },
  {
    id:    'database',
    label: 'Database',
    icon:  '🗄️',
    fields: ['connectionString', 'table'],
    usePicker: null,
    placeholder: 'postgresql://user:pass@host:5432/dbname',
    note: 'SQL or NoSQL connection string. Optionally specify a table or collection.',
  },
];

export const ACCESS_MODES = [
  { id: 'read',       label: 'Read',       color: '#38bdf8' },
  { id: 'write',      label: 'Write',      color: '#f59e0b' },
  { id: 'read-write', label: 'Read+Write', color: '#a855f7' },
];

export function getSourceType(id) {
  return DATA_SOURCE_TYPES.find(t => t.id === id) || DATA_SOURCE_TYPES[0];
}

export function makeDataSource() {
  return {
    id:               'ds_' + Date.now(),
    type:             'file',
    label:            '',
    path:             '',
    url:              '',
    connectionString: '',
    table:            '',
    sheet:            '',
    accessMode:       'read',
  };
}
