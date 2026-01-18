/**
 * Test setup - initialize in-memory database for testing
 */

import Database from 'better-sqlite3';
import { vi } from 'vitest';

// Create an in-memory database for testing
let testDb: Database.Database | null = null;

export function getTestDatabase(): Database.Database {
  if (!testDb) {
    testDb = new Database(':memory:');
    testDb.pragma('foreign_keys = ON');
    initializeTestSchema(testDb);
  }
  return testDb;
}

export function resetTestDatabase(): void {
  if (testDb) {
    testDb.close();
    testDb = null;
  }
  testDb = new Database(':memory:');
  testDb.pragma('foreign_keys = ON');
  initializeTestSchema(testDb);
}

function initializeTestSchema(db: Database.Database): void {
  db.exec(`
    -- Authors table
    CREATE TABLE IF NOT EXISTS authors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      bio TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Publishers table
    CREATE TABLE IF NOT EXISTS publishers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      website TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Series table
    CREATE TABLE IF NOT EXISTS series (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Genres table
    CREATE TABLE IF NOT EXISTS genres (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Topics table
    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Categories table
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      color TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Books table
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      isbn TEXT,
      publication_year INTEGER,
      pages INTEGER,
      description TEXT,
      cover_image TEXT,
      reading_status TEXT DEFAULT 'unread' CHECK(reading_status IN ('unread', 'reading', 'completed')),
      notes TEXT,
      rating REAL CHECK(rating >= 0 AND rating <= 5),
      publisher_id TEXT NOT NULL,
      series_id TEXT,
      series_order INTEGER,
      category_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE RESTRICT,
      FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE SET NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );

    -- Book-Authors junction table
    CREATE TABLE IF NOT EXISTS book_authors (
      book_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      PRIMARY KEY (book_id, author_id),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
    );

    -- Book-Genres junction table
    CREATE TABLE IF NOT EXISTS book_genres (
      book_id TEXT NOT NULL,
      genre_id TEXT NOT NULL,
      PRIMARY KEY (book_id, genre_id),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
    );

    -- Book-Topics junction table
    CREATE TABLE IF NOT EXISTS book_topics (
      book_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      PRIMARY KEY (book_id, topic_id),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
    );

    -- Series-Authors junction table
    CREATE TABLE IF NOT EXISTS series_authors (
      series_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      PRIMARY KEY (series_id, author_id),
      FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
    );

    -- Insert default category
    INSERT OR IGNORE INTO categories (id, name, description, color)
    VALUES ('default-category', 'General', 'Default category for books', '#3b82f6');
  `);
}

// Mock the database connection module
vi.mock('../electron/database/connection', () => ({
  getDatabase: () => getTestDatabase(),
  initDatabase: () => {},
  closeDatabase: () => {
    if (testDb) {
      testDb.close();
      testDb = null;
    }
  },
  transaction: <T>(fn: () => T): T => {
    const db = getTestDatabase();
    return db.transaction(fn)();
  },
}));
