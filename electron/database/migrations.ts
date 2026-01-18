import { getDatabase } from './connection';

export function runMigrations(): void {
  const db = getDatabase();

  // Create migrations table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const migrations = [
    {
      name: '001_initial_schema',
      sql: `
        -- Authors table
        CREATE TABLE IF NOT EXISTS authors (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          bio TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_authors_name ON authors(name);

        -- Publishers table (each book has exactly one publisher)
        CREATE TABLE IF NOT EXISTS publishers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          location TEXT,
          website TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_publishers_name ON publishers(name);

        -- Series table
        CREATE TABLE IF NOT EXISTS series (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_series_name ON series(name);

        -- Genres table
        CREATE TABLE IF NOT EXISTS genres (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_genres_name ON genres(name);

        -- Topics table
        CREATE TABLE IF NOT EXISTS topics (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_topics_name ON topics(name);

        -- Categories table (each book belongs to exactly one category)
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          color TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

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
        CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
        CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);
        CREATE INDEX IF NOT EXISTS idx_books_year ON books(publication_year);
        CREATE INDEX IF NOT EXISTS idx_books_status ON books(reading_status);
        CREATE INDEX IF NOT EXISTS idx_books_publisher ON books(publisher_id);
        CREATE INDEX IF NOT EXISTS idx_books_series ON books(series_id);
        CREATE INDEX IF NOT EXISTS idx_books_category ON books(category_id);

        -- Book-Authors junction table (many-to-many)
        CREATE TABLE IF NOT EXISTS book_authors (
          book_id TEXT NOT NULL,
          author_id TEXT NOT NULL,
          PRIMARY KEY (book_id, author_id),
          FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
          FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
        );

        -- Book-Genres junction table (many-to-many)
        CREATE TABLE IF NOT EXISTS book_genres (
          book_id TEXT NOT NULL,
          genre_id TEXT NOT NULL,
          PRIMARY KEY (book_id, genre_id),
          FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
          FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
        );

        -- Book-Topics junction table (many-to-many)
        CREATE TABLE IF NOT EXISTS book_topics (
          book_id TEXT NOT NULL,
          topic_id TEXT NOT NULL,
          PRIMARY KEY (book_id, topic_id),
          FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
          FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
        );

        -- Series-Authors junction table (many-to-many, series must have at least one author)
        CREATE TABLE IF NOT EXISTS series_authors (
          series_id TEXT NOT NULL,
          author_id TEXT NOT NULL,
          PRIMARY KEY (series_id, author_id),
          FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE,
          FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
        );
      `,
    },
    {
      name: '002_seed_default_data',
      sql: `
        -- Insert default category (using a fixed UUID for consistency)
        INSERT OR IGNORE INTO categories (id, name, description, color)
        VALUES ('00000000-0000-4000-8000-000000000001', 'General', 'Default category for books', '#3b82f6');

        -- Insert some default genres (using fixed UUIDs)
        INSERT OR IGNORE INTO genres (id, name, description) VALUES
          ('00000000-0000-4000-8000-000000000010', 'Fiction', 'Imaginative or invented writing'),
          ('00000000-0000-4000-8000-000000000011', 'Non-Fiction', 'Factual writing based on real events'),
          ('00000000-0000-4000-8000-000000000012', 'Mystery', 'Stories involving crime or puzzles'),
          ('00000000-0000-4000-8000-000000000013', 'Science Fiction', 'Speculative fiction with scientific elements'),
          ('00000000-0000-4000-8000-000000000014', 'Fantasy', 'Fiction with magical or supernatural elements'),
          ('00000000-0000-4000-8000-000000000015', 'Romance', 'Stories focused on romantic relationships'),
          ('00000000-0000-4000-8000-000000000016', 'Thriller', 'Suspenseful, exciting stories'),
          ('00000000-0000-4000-8000-000000000017', 'Horror', 'Stories intended to frighten or disturb'),
          ('00000000-0000-4000-8000-000000000018', 'Biography', 'Stories about real people''s lives'),
          ('00000000-0000-4000-8000-000000000019', 'History', 'Stories about historical events');
      `,
    },
    {
      name: '003_add_fts_search',
      sql: `
        -- Create FTS5 virtual table for full-text search
        CREATE VIRTUAL TABLE IF NOT EXISTS books_fts USING fts5(
          title,
          description,
          notes,
          content='books',
          content_rowid='rowid'
        );

        -- Triggers to keep FTS index in sync
        CREATE TRIGGER IF NOT EXISTS books_ai AFTER INSERT ON books BEGIN
          INSERT INTO books_fts(rowid, title, description, notes)
          VALUES (NEW.rowid, NEW.title, NEW.description, NEW.notes);
        END;

        CREATE TRIGGER IF NOT EXISTS books_ad AFTER DELETE ON books BEGIN
          INSERT INTO books_fts(books_fts, rowid, title, description, notes)
          VALUES ('delete', OLD.rowid, OLD.title, OLD.description, OLD.notes);
        END;

        CREATE TRIGGER IF NOT EXISTS books_au AFTER UPDATE ON books BEGIN
          INSERT INTO books_fts(books_fts, rowid, title, description, notes)
          VALUES ('delete', OLD.rowid, OLD.title, OLD.description, OLD.notes);
          INSERT INTO books_fts(rowid, title, description, notes)
          VALUES (NEW.rowid, NEW.title, NEW.description, NEW.notes);
        END;
      `,
    },
    {
      name: '004_fix_seed_data_uuids',
      sql: `
        -- Update category IDs to use valid UUIDs
        UPDATE books SET category_id = '00000000-0000-4000-8000-000000000001' WHERE category_id = 'default-category';
        UPDATE categories SET id = '00000000-0000-4000-8000-000000000001' WHERE id = 'default-category';

        -- Update genre IDs to use valid UUIDs
        UPDATE book_genres SET genre_id = '00000000-0000-4000-8000-000000000010' WHERE genre_id = 'genre-fiction';
        UPDATE book_genres SET genre_id = '00000000-0000-4000-8000-000000000011' WHERE genre_id = 'genre-nonfiction';
        UPDATE book_genres SET genre_id = '00000000-0000-4000-8000-000000000012' WHERE genre_id = 'genre-mystery';
        UPDATE book_genres SET genre_id = '00000000-0000-4000-8000-000000000013' WHERE genre_id = 'genre-scifi';
        UPDATE book_genres SET genre_id = '00000000-0000-4000-8000-000000000014' WHERE genre_id = 'genre-fantasy';
        UPDATE book_genres SET genre_id = '00000000-0000-4000-8000-000000000015' WHERE genre_id = 'genre-romance';
        UPDATE book_genres SET genre_id = '00000000-0000-4000-8000-000000000016' WHERE genre_id = 'genre-thriller';
        UPDATE book_genres SET genre_id = '00000000-0000-4000-8000-000000000017' WHERE genre_id = 'genre-horror';
        UPDATE book_genres SET genre_id = '00000000-0000-4000-8000-000000000018' WHERE genre_id = 'genre-biography';
        UPDATE book_genres SET genre_id = '00000000-0000-4000-8000-000000000019' WHERE genre_id = 'genre-history';

        UPDATE genres SET id = '00000000-0000-4000-8000-000000000010' WHERE id = 'genre-fiction';
        UPDATE genres SET id = '00000000-0000-4000-8000-000000000011' WHERE id = 'genre-nonfiction';
        UPDATE genres SET id = '00000000-0000-4000-8000-000000000012' WHERE id = 'genre-mystery';
        UPDATE genres SET id = '00000000-0000-4000-8000-000000000013' WHERE id = 'genre-scifi';
        UPDATE genres SET id = '00000000-0000-4000-8000-000000000014' WHERE id = 'genre-fantasy';
        UPDATE genres SET id = '00000000-0000-4000-8000-000000000015' WHERE id = 'genre-romance';
        UPDATE genres SET id = '00000000-0000-4000-8000-000000000016' WHERE id = 'genre-thriller';
        UPDATE genres SET id = '00000000-0000-4000-8000-000000000017' WHERE id = 'genre-horror';
        UPDATE genres SET id = '00000000-0000-4000-8000-000000000018' WHERE id = 'genre-biography';
        UPDATE genres SET id = '00000000-0000-4000-8000-000000000019' WHERE id = 'genre-history';
      `,
    },
  ];

  // Apply pending migrations
  const appliedMigrations = db.prepare('SELECT name FROM migrations').all() as { name: string }[];
  const appliedNames = new Set(appliedMigrations.map(m => m.name));

  for (const migration of migrations) {
    if (!appliedNames.has(migration.name)) {
      console.log(`Applying migration: ${migration.name}`);
      db.exec(migration.sql);
      db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migration.name);
      console.log(`Migration ${migration.name} applied successfully`);
    }
  }

  console.log('All migrations applied');
}
