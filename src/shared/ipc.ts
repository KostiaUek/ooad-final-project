// IPC Channel definitions for communication between main and renderer processes
// This file defines all available IPC channels and their signatures

import type {
  Author,
  AuthorInput,
  AuthorWithStats,
  AuthorDeleteImpact,
  Book,
  BookInput,
  BookSearchParams,
  BookWithRelations,
  BookDeleteImpact,
  Category,
  CategoryInput,
  CategoryWithStats,
  CleanupResult,
  Genre,
  GenreInput,
  GenreWithStats,
  ImportResult,
  IntegrityCheckResult,
  LibraryStats,
  PaginatedResponse,
  Publisher,
  PublisherInput,
  PublisherWithStats,
  ReadingProgressUpdate,
  Series,
  SeriesInput,
  SeriesWithAuthors,
  Topic,
  TopicInput,
  TopicWithStats,
} from './types';

// ============================================================================
// IPC Channel Names
// ============================================================================

export const IPC_CHANNELS = {
  // Book operations
  BOOK_CREATE: 'book:create',
  BOOK_UPDATE: 'book:update',
  BOOK_DELETE: 'book:delete',
  BOOK_GET: 'book:get',
  BOOK_GET_ALL: 'book:getAll',
  BOOK_SEARCH: 'book:search',
  BOOK_UPDATE_PROGRESS: 'book:updateProgress',

  // Author operations
  AUTHOR_CREATE: 'author:create',
  AUTHOR_UPDATE: 'author:update',
  AUTHOR_DELETE: 'author:delete',
  AUTHOR_GET: 'author:get',
  AUTHOR_GET_ALL: 'author:getAll',
  AUTHOR_CHECK_DELETE_IMPACT: 'author:checkDeleteImpact',

  // Publisher operations
  PUBLISHER_CREATE: 'publisher:create',
  PUBLISHER_UPDATE: 'publisher:update',
  PUBLISHER_DELETE: 'publisher:delete',
  PUBLISHER_GET: 'publisher:get',
  PUBLISHER_GET_ALL: 'publisher:getAll',

  // Series operations
  SERIES_CREATE: 'series:create',
  SERIES_UPDATE: 'series:update',
  SERIES_DELETE: 'series:delete',
  SERIES_GET: 'series:get',
  SERIES_GET_ALL: 'series:getAll',

  // Genre operations
  GENRE_CREATE: 'genre:create',
  GENRE_UPDATE: 'genre:update',
  GENRE_DELETE: 'genre:delete',
  GENRE_GET: 'genre:get',
  GENRE_GET_ALL: 'genre:getAll',

  // Topic operations
  TOPIC_CREATE: 'topic:create',
  TOPIC_UPDATE: 'topic:update',
  TOPIC_DELETE: 'topic:delete',
  TOPIC_GET: 'topic:get',
  TOPIC_GET_ALL: 'topic:getAll',

  // Category operations
  CATEGORY_CREATE: 'category:create',
  CATEGORY_UPDATE: 'category:update',
  CATEGORY_DELETE: 'category:delete',
  CATEGORY_GET: 'category:get',
  CATEGORY_GET_ALL: 'category:getAll',

  // Library operations
  LIBRARY_STATS: 'library:stats',
  LIBRARY_INTEGRITY_CHECK: 'library:integrityCheck',
  LIBRARY_CLEANUP_ORPHANS: 'library:cleanupOrphans',
  BOOK_CHECK_DELETE_IMPACT: 'book:checkDeleteImpact',
  BOOK_CHECK_UPDATE_IMPACT: 'book:checkUpdateImpact',

  // Import/Export operations
  EXPORT_JSON: 'export:json',
  EXPORT_CSV: 'export:csv',
  IMPORT_JSON: 'import:json',
  SELECT_EXPORT_PATH: 'dialog:selectExportPath',
  SELECT_IMPORT_FILE: 'dialog:selectImportFile',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

// ============================================================================
// IPC Handler Type Definitions
// ============================================================================

export interface IpcHandlers {
  // Book operations
  [IPC_CHANNELS.BOOK_CREATE]: (input: BookInput) => Promise<BookWithRelations>;
  [IPC_CHANNELS.BOOK_UPDATE]: (id: string, input: BookInput, options?: { cleanupOrphans?: boolean }) => Promise<BookWithRelations>;
  [IPC_CHANNELS.BOOK_DELETE]: (id: string, options?: { cleanupOrphans?: boolean }) => Promise<void>;
  [IPC_CHANNELS.BOOK_GET]: (id: string) => Promise<BookWithRelations | null>;
  [IPC_CHANNELS.BOOK_GET_ALL]: () => Promise<BookWithRelations[]>;
  [IPC_CHANNELS.BOOK_SEARCH]: (params: BookSearchParams) => Promise<PaginatedResponse<BookWithRelations>>;
  [IPC_CHANNELS.BOOK_UPDATE_PROGRESS]: (update: ReadingProgressUpdate) => Promise<Book>;

  // Author operations
  [IPC_CHANNELS.AUTHOR_CREATE]: (input: AuthorInput) => Promise<Author>;
  [IPC_CHANNELS.AUTHOR_UPDATE]: (id: string, input: AuthorInput) => Promise<Author>;
  [IPC_CHANNELS.AUTHOR_DELETE]: (id: string) => Promise<void>;
  [IPC_CHANNELS.AUTHOR_GET]: (id: string) => Promise<AuthorWithStats | null>;
  [IPC_CHANNELS.AUTHOR_GET_ALL]: () => Promise<AuthorWithStats[]>;
  [IPC_CHANNELS.AUTHOR_CHECK_DELETE_IMPACT]: (id: string) => Promise<AuthorDeleteImpact>;

  // Publisher operations
  [IPC_CHANNELS.PUBLISHER_CREATE]: (input: PublisherInput) => Promise<Publisher>;
  [IPC_CHANNELS.PUBLISHER_UPDATE]: (id: string, input: PublisherInput) => Promise<Publisher>;
  [IPC_CHANNELS.PUBLISHER_DELETE]: (id: string) => Promise<void>;
  [IPC_CHANNELS.PUBLISHER_GET]: (id: string) => Promise<PublisherWithStats | null>;
  [IPC_CHANNELS.PUBLISHER_GET_ALL]: () => Promise<PublisherWithStats[]>;

  // Series operations
  [IPC_CHANNELS.SERIES_CREATE]: (input: SeriesInput) => Promise<Series>;
  [IPC_CHANNELS.SERIES_UPDATE]: (id: string, input: SeriesInput) => Promise<Series>;
  [IPC_CHANNELS.SERIES_DELETE]: (id: string) => Promise<void>;
  [IPC_CHANNELS.SERIES_GET]: (id: string) => Promise<SeriesWithAuthors | null>;
  [IPC_CHANNELS.SERIES_GET_ALL]: () => Promise<SeriesWithAuthors[]>;

  // Genre operations
  [IPC_CHANNELS.GENRE_CREATE]: (input: GenreInput) => Promise<Genre>;
  [IPC_CHANNELS.GENRE_UPDATE]: (id: string, input: GenreInput) => Promise<Genre>;
  [IPC_CHANNELS.GENRE_DELETE]: (id: string) => Promise<void>;
  [IPC_CHANNELS.GENRE_GET]: (id: string) => Promise<GenreWithStats | null>;
  [IPC_CHANNELS.GENRE_GET_ALL]: () => Promise<GenreWithStats[]>;

  // Topic operations
  [IPC_CHANNELS.TOPIC_CREATE]: (input: TopicInput) => Promise<Topic>;
  [IPC_CHANNELS.TOPIC_UPDATE]: (id: string, input: TopicInput) => Promise<Topic>;
  [IPC_CHANNELS.TOPIC_DELETE]: (id: string) => Promise<void>;
  [IPC_CHANNELS.TOPIC_GET]: (id: string) => Promise<TopicWithStats | null>;
  [IPC_CHANNELS.TOPIC_GET_ALL]: () => Promise<TopicWithStats[]>;

  // Category operations
  [IPC_CHANNELS.CATEGORY_CREATE]: (input: CategoryInput) => Promise<Category>;
  [IPC_CHANNELS.CATEGORY_UPDATE]: (id: string, input: CategoryInput) => Promise<Category>;
  [IPC_CHANNELS.CATEGORY_DELETE]: (id: string) => Promise<void>;
  [IPC_CHANNELS.CATEGORY_GET]: (id: string) => Promise<CategoryWithStats | null>;
  [IPC_CHANNELS.CATEGORY_GET_ALL]: () => Promise<CategoryWithStats[]>;

  // Library operations
  [IPC_CHANNELS.LIBRARY_STATS]: () => Promise<LibraryStats>;
  [IPC_CHANNELS.LIBRARY_INTEGRITY_CHECK]: () => Promise<IntegrityCheckResult>;
  [IPC_CHANNELS.LIBRARY_CLEANUP_ORPHANS]: () => Promise<CleanupResult>;
  [IPC_CHANNELS.BOOK_CHECK_DELETE_IMPACT]: (id: string) => Promise<BookDeleteImpact>;
  [IPC_CHANNELS.BOOK_CHECK_UPDATE_IMPACT]: (id: string, input: BookInput) => Promise<BookDeleteImpact>;

  // Import/Export operations
  [IPC_CHANNELS.EXPORT_JSON]: (filePath: string) => Promise<void>;
  [IPC_CHANNELS.EXPORT_CSV]: (filePath: string) => Promise<void>;
  [IPC_CHANNELS.IMPORT_JSON]: (filePath: string) => Promise<ImportResult>;
  [IPC_CHANNELS.SELECT_EXPORT_PATH]: (format: 'json' | 'csv') => Promise<string | null>;
  [IPC_CHANNELS.SELECT_IMPORT_FILE]: () => Promise<string | null>;
}

// ============================================================================
// Electron API exposed to renderer
// ============================================================================

export interface ElectronAPI {
  // Book operations
  createBook: (input: BookInput) => Promise<BookWithRelations>;
  updateBook: (id: string, input: BookInput, options?: { cleanupOrphans?: boolean }) => Promise<BookWithRelations>;
  deleteBook: (id: string, options?: { cleanupOrphans?: boolean }) => Promise<void>;
  getBook: (id: string) => Promise<BookWithRelations | null>;
  getAllBooks: () => Promise<BookWithRelations[]>;
  searchBooks: (params: BookSearchParams) => Promise<PaginatedResponse<BookWithRelations>>;
  updateReadingProgress: (update: ReadingProgressUpdate) => Promise<Book>;
  checkBookDeleteImpact: (id: string) => Promise<BookDeleteImpact>;
  checkBookUpdateImpact: (id: string, input: BookInput) => Promise<BookDeleteImpact>;

  // Author operations
  createAuthor: (input: AuthorInput) => Promise<Author>;
  updateAuthor: (id: string, input: AuthorInput) => Promise<Author>;
  deleteAuthor: (id: string) => Promise<void>;
  getAuthor: (id: string) => Promise<AuthorWithStats | null>;
  getAllAuthors: () => Promise<AuthorWithStats[]>;
  checkAuthorDeleteImpact: (id: string) => Promise<AuthorDeleteImpact>;

  // Publisher operations
  createPublisher: (input: PublisherInput) => Promise<Publisher>;
  updatePublisher: (id: string, input: PublisherInput) => Promise<Publisher>;
  deletePublisher: (id: string) => Promise<void>;
  getPublisher: (id: string) => Promise<PublisherWithStats | null>;
  getAllPublishers: () => Promise<PublisherWithStats[]>;

  // Series operations
  createSeries: (input: SeriesInput) => Promise<Series>;
  updateSeries: (id: string, input: SeriesInput) => Promise<Series>;
  deleteSeries: (id: string) => Promise<void>;
  getSeries: (id: string) => Promise<SeriesWithAuthors | null>;
  getAllSeries: () => Promise<SeriesWithAuthors[]>;

  // Genre operations
  createGenre: (input: GenreInput) => Promise<Genre>;
  updateGenre: (id: string, input: GenreInput) => Promise<Genre>;
  deleteGenre: (id: string) => Promise<void>;
  getGenre: (id: string) => Promise<GenreWithStats | null>;
  getAllGenres: () => Promise<GenreWithStats[]>;

  // Topic operations
  createTopic: (input: TopicInput) => Promise<Topic>;
  updateTopic: (id: string, input: TopicInput) => Promise<Topic>;
  deleteTopic: (id: string) => Promise<void>;
  getTopic: (id: string) => Promise<TopicWithStats | null>;
  getAllTopics: () => Promise<TopicWithStats[]>;

  // Category operations
  createCategory: (input: CategoryInput) => Promise<Category>;
  updateCategory: (id: string, input: CategoryInput) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
  getCategory: (id: string) => Promise<CategoryWithStats | null>;
  getAllCategories: () => Promise<CategoryWithStats[]>;

  // Library operations
  getLibraryStats: () => Promise<LibraryStats>;
  integrityCheck: () => Promise<IntegrityCheckResult>;
  cleanupOrphans: () => Promise<CleanupResult>;

  // Import/Export operations
  exportToJson: (filePath: string) => Promise<void>;
  exportToCsv: (filePath: string) => Promise<void>;
  importFromJson: (filePath: string) => Promise<ImportResult>;
  selectExportPath: (format: 'json' | 'csv') => Promise<string | null>;
  selectImportFile: () => Promise<string | null>;
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
