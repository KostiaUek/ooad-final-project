// Shared type definitions for the Home Library Management App
// These types are used by both the main process and renderer

import { z } from 'zod';

// ============================================================================
// Reading Status Enum
// ============================================================================
export const ReadingStatus = {
  UNREAD: 'unread',
  READING: 'reading',
  COMPLETED: 'completed',
} as const;

export type ReadingStatusType = typeof ReadingStatus[keyof typeof ReadingStatus];

// ============================================================================
// Base Entity Types
// ============================================================================

export interface Author {
  id: string;
  name: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Publisher {
  id: string;
  name: string;
  location?: string;
  website?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Series {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Genre {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Book {
  id: string;
  title: string;
  isbn?: string;
  publicationYear?: number;
  pages?: number;
  description?: string;
  coverImage?: string;
  readingStatus: ReadingStatusType;
  notes?: string;
  rating?: number;
  publisherId: string;
  seriesId?: string;
  seriesOrder?: number;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Extended Types with Relations
// ============================================================================

export interface BookWithRelations extends Book {
  publisher?: Publisher;
  series?: Series;
  category?: Category;
  authors: Author[];
  genres: Genre[];
  topics: Topic[];
}

export interface SeriesWithAuthors extends Series {
  authors: Author[];
  bookCount: number;
}

export interface AuthorWithStats extends Author {
  bookCount: number;
  seriesCount: number;
}

export interface PublisherWithStats extends Publisher {
  bookCount: number;
}

export interface GenreWithStats extends Genre {
  bookCount: number;
}

export interface TopicWithStats extends Topic {
  bookCount: number;
}

export interface CategoryWithStats extends Category {
  bookCount: number;
}

// ============================================================================
// Library Statistics
// ============================================================================

export interface LibraryStats {
  totalBooks: number;
  totalAuthors: number;
  totalPublishers: number;
  totalSeries: number;
  totalGenres: number;
  totalTopics: number;
  totalCategories: number;
  readingStatusBreakdown: {
    unread: number;
    reading: number;
    completed: number;
  };
  topGenres: Array<{ name: string; count: number }>;
  topAuthors: Array<{ name: string; count: number }>;
  recentBooks: BookWithRelations[];
  recommendedBooks: BookWithRelations[];
}

// ============================================================================
// Search and Filter Types
// ============================================================================

export interface BookSearchParams {
  query?: string;
  authorId?: string;
  genreId?: string;
  publisherId?: string;
  seriesId?: string;
  categoryId?: string;
  topicId?: string;
  readingStatus?: ReadingStatusType;
  yearFrom?: number;
  yearTo?: number;
  sortBy?: 'title' | 'author' | 'year' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// ============================================================================
// Import/Export Types
// ============================================================================

export interface ExportData {
  version: string;
  exportedAt: string;
  books: BookWithRelations[];
  authors: Author[];
  publishers: Publisher[];
  series: SeriesWithAuthors[];
  genres: Genre[];
  topics: Topic[];
  categories: Category[];
}

export interface ImportResult {
  success: boolean;
  booksImported: number;
  authorsImported: number;
  publishersImported: number;
  seriesImported: number;
  genresImported: number;
  topicsImported: number;
  categoriesImported: number;
  errors: string[];
}

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const AuthorSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Author name is required').max(255),
  bio: z.string().max(2000).optional(),
});

export const PublisherSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Publisher name is required').max(255),
  location: z.string().max(255).optional(),
  website: z.string().url().optional().or(z.literal('')),
});

export const SeriesSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Series name is required').max(255),
  description: z.string().max(2000).optional(),
  authorIds: z.array(z.string().uuid()).min(1, 'Series must have at least one author'),
});

export const GenreSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Genre name is required').max(100),
  description: z.string().max(500).optional(),
});

export const TopicSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Topic name is required').max(100),
  description: z.string().max(500).optional(),
});

export const CategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const BookSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Book title is required').max(500),
  isbn: z.string().max(20).optional().or(z.literal('')),
  publicationYear: z.number().int().min(1000).max(new Date().getFullYear() + 1).optional(),
  pages: z.number().int().positive().optional(),
  description: z.string().max(5000).optional(),
  coverImage: z.string().optional(),
  readingStatus: z.enum(['unread', 'reading', 'completed']).default('unread'),
  notes: z.string().max(10000).optional(),
  rating: z.number().min(0).max(5).optional(),
  publisherId: z.string().uuid('Publisher is required'),
  seriesId: z.string().uuid().optional().nullable(),
  seriesOrder: z.number().int().positive().optional(),
  categoryId: z.string().uuid('Category is required'),
  authorIds: z.array(z.string().uuid()).default([]),
  genreIds: z.array(z.string().uuid()).default([]),
  topicIds: z.array(z.string().uuid()).default([]),
});

export const BookSearchParamsSchema = z.object({
  query: z.string().optional(),
  authorId: z.string().uuid().optional(),
  genreId: z.string().uuid().optional(),
  publisherId: z.string().uuid().optional(),
  seriesId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  topicId: z.string().uuid().optional(),
  readingStatus: z.enum(['unread', 'reading', 'completed']).optional(),
  yearFrom: z.number().int().optional(),
  yearTo: z.number().int().optional(),
  sortBy: z.enum(['title', 'author', 'year', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
});

export const ReadingProgressUpdateSchema = z.object({
  bookId: z.string().uuid(),
  readingStatus: z.enum(['unread', 'reading', 'completed']),
  notes: z.string().max(10000).optional(),
});

// ============================================================================
// Input Types (for creating/updating)
// ============================================================================

export type AuthorInput = z.infer<typeof AuthorSchema>;
export type PublisherInput = z.infer<typeof PublisherSchema>;
export type SeriesInput = z.infer<typeof SeriesSchema>;
export type GenreInput = z.infer<typeof GenreSchema>;
export type TopicInput = z.infer<typeof TopicSchema>;
export type CategoryInput = z.infer<typeof CategorySchema>;
export type BookInput = z.infer<typeof BookSchema>;
export type ReadingProgressUpdate = z.infer<typeof ReadingProgressUpdateSchema>;

// ============================================================================
// Integrity Check Types
// ============================================================================

export interface IntegrityViolation {
  type: 'orphan_author' | 'orphan_publisher' | 'orphan_series' | 'series_no_authors' | 'book_no_publisher' | 'book_no_category';
  entityType: string;
  entityId: string;
  entityName: string;
  message: string;
}

export interface IntegrityCheckResult {
  isValid: boolean;
  violations: IntegrityViolation[];
  summary: {
    orphanAuthors: number;
    orphanPublishers: number;
    orphanSeries: number;
    seriesWithNoAuthors: number;
    booksWithNoPublisher: number;
    booksWithNoCategory: number;
  };
}

export interface BookDeleteImpact {
  orphanedAuthors: Array<{ id: string; name: string }>;
  orphanedPublisher: { id: string; name: string } | null;
  orphanedSeries: { id: string; name: string } | null;
  hasImpact: boolean;
}

export interface AuthorDeleteImpact {
  seriesWithNoAuthors: Array<{ id: string; name: string }>;
  hasImpact: boolean;
}

export interface CleanupResult {
  deletedAuthors: string[];
  deletedPublishers: string[];
  deletedSeries: string[];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
