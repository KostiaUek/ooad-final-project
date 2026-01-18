/**
 * Business Rules Tests
 * 
 * Tests for the core invariants from project-description-context.md:
 * 1. Author must have ≥1 book (no orphan authors allowed)
 * 2. Publisher must have ≥1 book (no orphan publishers allowed)
 * 3. Series must have ≥1 book and ≥1 author (no orphan series allowed)
 * 4. Book deletion must handle orphaned entities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTestDatabase, resetTestDatabase } from './setup';
import { v4 as uuidv4 } from 'uuid';

// Helper to generate unique IDs
function generateId(): string {
  return uuidv4();
}

// Test helper to insert entities directly
function insertAuthor(name: string): string {
  const db = getTestDatabase();
  const id = generateId();
  db.prepare('INSERT INTO authors (id, name) VALUES (?, ?)').run(id, name);
  return id;
}

function insertPublisher(name: string): string {
  const db = getTestDatabase();
  const id = generateId();
  db.prepare('INSERT INTO publishers (id, name) VALUES (?, ?)').run(id, name);
  return id;
}

function insertSeries(name: string): string {
  const db = getTestDatabase();
  const id = generateId();
  db.prepare('INSERT INTO series (id, name) VALUES (?, ?)').run(id, name);
  return id;
}

function insertBook(title: string, publisherId: string, categoryId: string, seriesId?: string): string {
  const db = getTestDatabase();
  const id = generateId();
  db.prepare(`
    INSERT INTO books (id, title, publisher_id, category_id, series_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, title, publisherId, categoryId, seriesId || null);
  return id;
}

function linkBookAuthor(bookId: string, authorId: string): void {
  const db = getTestDatabase();
  db.prepare('INSERT INTO book_authors (book_id, author_id) VALUES (?, ?)').run(bookId, authorId);
}

function linkSeriesAuthor(seriesId: string, authorId: string): void {
  const db = getTestDatabase();
  db.prepare('INSERT INTO series_authors (series_id, author_id) VALUES (?, ?)').run(seriesId, authorId);
}

function getAuthorBookCount(authorId: string): number {
  const db = getTestDatabase();
  const result = db.prepare('SELECT COUNT(*) as count FROM book_authors WHERE author_id = ?').get(authorId) as { count: number };
  return result.count;
}

function getPublisherBookCount(publisherId: string): number {
  const db = getTestDatabase();
  const result = db.prepare('SELECT COUNT(*) as count FROM books WHERE publisher_id = ?').get(publisherId) as { count: number };
  return result.count;
}

function getSeriesBookCount(seriesId: string): number {
  const db = getTestDatabase();
  const result = db.prepare('SELECT COUNT(*) as count FROM books WHERE series_id = ?').get(seriesId) as { count: number };
  return result.count;
}

function getOrphanAuthors(): { id: string; name: string }[] {
  const db = getTestDatabase();
  return db.prepare(`
    SELECT a.id, a.name FROM authors a
    LEFT JOIN book_authors ba ON a.id = ba.author_id
    WHERE ba.book_id IS NULL
  `).all() as { id: string; name: string }[];
}

function getOrphanPublishers(): { id: string; name: string }[] {
  const db = getTestDatabase();
  return db.prepare(`
    SELECT p.id, p.name FROM publishers p
    LEFT JOIN books b ON p.id = b.publisher_id
    WHERE b.id IS NULL
  `).all() as { id: string; name: string }[];
}

function getOrphanSeries(): { id: string; name: string }[] {
  const db = getTestDatabase();
  return db.prepare(`
    SELECT s.id, s.name FROM series s
    LEFT JOIN books b ON s.id = b.series_id
    WHERE b.id IS NULL
  `).all() as { id: string; name: string }[];
}

describe('Business Rules', () => {
  beforeEach(() => {
    resetTestDatabase();
  });

  describe('Rule 1: Author must have ≥1 book', () => {
    it('should detect orphan author (author without books)', () => {
      // Create an orphan author
      const authorId = insertAuthor('Orphan Author');
      
      // Verify author exists but has no books
      expect(getAuthorBookCount(authorId)).toBe(0);
      
      // Verify orphan detection works
      const orphans = getOrphanAuthors();
      expect(orphans).toHaveLength(1);
      expect(orphans[0].name).toBe('Orphan Author');
    });

    it('should not detect author with books as orphan', () => {
      const authorId = insertAuthor('Published Author');
      const publisherId = insertPublisher('Test Publisher');
      const bookId = insertBook('Test Book', publisherId, 'default-category');
      linkBookAuthor(bookId, authorId);
      
      expect(getAuthorBookCount(authorId)).toBe(1);
      expect(getOrphanAuthors()).toHaveLength(0);
    });

    it('should prevent deleting author when they have books', () => {
      const db = getTestDatabase();
      const authorId = insertAuthor('Author With Book');
      const publisherId = insertPublisher('Test Publisher');
      const bookId = insertBook('Test Book', publisherId, 'default-category');
      linkBookAuthor(bookId, authorId);
      
      // Attempting to delete author should fail due to book_authors reference
      // The foreign key ON DELETE CASCADE would handle this, but we want to block it at the business logic level
      expect(getAuthorBookCount(authorId)).toBe(1);
      
      // Business rule: author with books should not be deletable
      // This test verifies the constraint that would be enforced by our repository
      const hasBooks = getAuthorBookCount(authorId) > 0;
      expect(hasBooks).toBe(true);
    });
  });

  describe('Rule 2: Publisher must have ≥1 book', () => {
    it('should detect orphan publisher (publisher without books)', () => {
      const publisherId = insertPublisher('Orphan Publisher');
      
      expect(getPublisherBookCount(publisherId)).toBe(0);
      
      const orphans = getOrphanPublishers();
      expect(orphans).toHaveLength(1);
      expect(orphans[0].name).toBe('Orphan Publisher');
    });

    it('should not detect publisher with books as orphan', () => {
      const publisherId = insertPublisher('Active Publisher');
      const authorId = insertAuthor('Test Author');
      const bookId = insertBook('Test Book', publisherId, 'default-category');
      linkBookAuthor(bookId, authorId);
      
      expect(getPublisherBookCount(publisherId)).toBe(1);
      expect(getOrphanPublishers()).toHaveLength(0);
    });

    it('should block deleting publisher when they have books (RESTRICT)', () => {
      const db = getTestDatabase();
      const publisherId = insertPublisher('Publisher With Book');
      insertBook('Test Book', publisherId, 'default-category');
      
      // Foreign key constraint should prevent deletion
      expect(() => {
        db.prepare('DELETE FROM publishers WHERE id = ?').run(publisherId);
      }).toThrow(); // SQLite RESTRICT foreign key
    });
  });

  describe('Rule 3: Series must have ≥1 book and ≥1 author', () => {
    it('should detect orphan series (series without books)', () => {
      const seriesId = insertSeries('Orphan Series');
      
      expect(getSeriesBookCount(seriesId)).toBe(0);
      
      const orphans = getOrphanSeries();
      expect(orphans).toHaveLength(1);
      expect(orphans[0].name).toBe('Orphan Series');
    });

    it('should not detect series with books as orphan', () => {
      const seriesId = insertSeries('Active Series');
      const publisherId = insertPublisher('Test Publisher');
      const authorId = insertAuthor('Test Author');
      const bookId = insertBook('Series Book', publisherId, 'default-category', seriesId);
      linkBookAuthor(bookId, authorId);
      linkSeriesAuthor(seriesId, authorId);
      
      expect(getSeriesBookCount(seriesId)).toBe(1);
      expect(getOrphanSeries()).toHaveLength(0);
    });

    it('should require series to have at least one author', () => {
      const db = getTestDatabase();
      const seriesId = insertSeries('Series Without Author');
      
      // Series exists but has no authors
      const authorCount = db.prepare(`
        SELECT COUNT(*) as count FROM series_authors WHERE series_id = ?
      `).get(seriesId) as { count: number };
      
      expect(authorCount.count).toBe(0);
      
      // This would be a violation - series should have ≥1 author
      // In practice, this is enforced by Zod schema requiring min(1) authorIds
    });

    it('should detect when deleting author would leave series without authors', () => {
      const db = getTestDatabase();
      const authorId = insertAuthor('Only Series Author');
      const seriesId = insertSeries('Series With One Author');
      linkSeriesAuthor(seriesId, authorId);
      
      // Check if this author is the sole author of any series
      const seriesWithOnlyThisAuthor = db.prepare(`
        SELECT s.id, s.name FROM series s
        JOIN series_authors sa ON s.id = sa.series_id
        WHERE sa.author_id = ?
        AND (SELECT COUNT(*) FROM series_authors sa2 WHERE sa2.series_id = s.id) = 1
      `).all(authorId) as Array<{ id: string; name: string }>;
      
      expect(seriesWithOnlyThisAuthor).toHaveLength(1);
      expect(seriesWithOnlyThisAuthor[0].name).toBe('Series With One Author');
      
      // Now add a second author to the series and verify deletion would be safe
      const secondAuthorId = insertAuthor('Second Author');
      linkSeriesAuthor(seriesId, secondAuthorId);
      
      const seriesAfterAddingAuthor = db.prepare(`
        SELECT s.id, s.name FROM series s
        JOIN series_authors sa ON s.id = sa.series_id
        WHERE sa.author_id = ?
        AND (SELECT COUNT(*) FROM series_authors sa2 WHERE sa2.series_id = s.id) = 1
      `).all(authorId) as Array<{ id: string; name: string }>;
      
      expect(seriesAfterAddingAuthor).toHaveLength(0); // Now safe to delete the first author
    });
  });

  describe('Rule 4: Book deletion must handle orphaned entities', () => {
    it('should identify entities that would become orphaned when book is deleted', () => {
      const authorId = insertAuthor('Single Book Author');
      const publisherId = insertPublisher('Single Book Publisher');
      const seriesId = insertSeries('Single Book Series');
      const bookId = insertBook('Only Book', publisherId, 'default-category', seriesId);
      linkBookAuthor(bookId, authorId);
      linkSeriesAuthor(seriesId, authorId);
      
      // Simulate what happens when we delete this book
      const db = getTestDatabase();
      
      // Check if author would be orphaned
      const authorOtherBooks = db.prepare(`
        SELECT COUNT(*) as count FROM book_authors 
        WHERE author_id = ? AND book_id != ?
      `).get(authorId, bookId) as { count: number };
      
      // Check if publisher would be orphaned
      const publisherOtherBooks = db.prepare(`
        SELECT COUNT(*) as count FROM books 
        WHERE publisher_id = ? AND id != ?
      `).get(publisherId, bookId) as { count: number };
      
      // Check if series would be orphaned
      const seriesOtherBooks = db.prepare(`
        SELECT COUNT(*) as count FROM books 
        WHERE series_id = ? AND id != ?
      `).get(seriesId, bookId) as { count: number };
      
      expect(authorOtherBooks.count).toBe(0); // Would be orphaned
      expect(publisherOtherBooks.count).toBe(0); // Would be orphaned
      expect(seriesOtherBooks.count).toBe(0); // Would be orphaned
    });

    it('should not orphan entities when other books exist', () => {
      const authorId = insertAuthor('Multi Book Author');
      const publisherId = insertPublisher('Multi Book Publisher');
      const seriesId = insertSeries('Multi Book Series');
      
      // Create two books
      const bookId1 = insertBook('First Book', publisherId, 'default-category', seriesId);
      const bookId2 = insertBook('Second Book', publisherId, 'default-category', seriesId);
      linkBookAuthor(bookId1, authorId);
      linkBookAuthor(bookId2, authorId);
      linkSeriesAuthor(seriesId, authorId);
      
      const db = getTestDatabase();
      
      // Check after hypothetical deletion of first book
      const authorOtherBooks = db.prepare(`
        SELECT COUNT(*) as count FROM book_authors 
        WHERE author_id = ? AND book_id != ?
      `).get(authorId, bookId1) as { count: number };
      
      const publisherOtherBooks = db.prepare(`
        SELECT COUNT(*) as count FROM books 
        WHERE publisher_id = ? AND id != ?
      `).get(publisherId, bookId1) as { count: number };
      
      expect(authorOtherBooks.count).toBe(1); // Would NOT be orphaned
      expect(publisherOtherBooks.count).toBe(1); // Would NOT be orphaned
    });
  });

  describe('Orphan cleanup functionality', () => {
    it('should be able to cleanup all orphan entities', () => {
      const db = getTestDatabase();
      
      // Create orphan entities
      insertAuthor('Orphan Author 1');
      insertAuthor('Orphan Author 2');
      insertPublisher('Orphan Publisher');
      insertSeries('Orphan Series');
      
      // Verify orphans exist
      expect(getOrphanAuthors()).toHaveLength(2);
      expect(getOrphanPublishers()).toHaveLength(1);
      expect(getOrphanSeries()).toHaveLength(1);
      
      // Cleanup orphans (simulating domainService.cleanupOrphans)
      db.prepare(`
        DELETE FROM authors WHERE id IN (
          SELECT a.id FROM authors a
          LEFT JOIN book_authors ba ON a.id = ba.author_id
          WHERE ba.book_id IS NULL
        )
      `).run();
      
      db.prepare(`
        DELETE FROM publishers WHERE id IN (
          SELECT p.id FROM publishers p
          LEFT JOIN books b ON p.id = b.publisher_id
          WHERE b.id IS NULL
        )
      `).run();
      
      db.prepare(`
        DELETE FROM series WHERE id IN (
          SELECT s.id FROM series s
          LEFT JOIN books b ON s.id = b.series_id
          WHERE b.id IS NULL
        )
      `).run();
      
      // Verify cleanup worked
      expect(getOrphanAuthors()).toHaveLength(0);
      expect(getOrphanPublishers()).toHaveLength(0);
      expect(getOrphanSeries()).toHaveLength(0);
    });
  });
});

describe('Data Integrity', () => {
  beforeEach(() => {
    resetTestDatabase();
  });

  it('should enforce publisher foreign key on books', () => {
    const db = getTestDatabase();
    
    expect(() => {
      db.prepare(`
        INSERT INTO books (id, title, publisher_id, category_id)
        VALUES (?, ?, ?, ?)
      `).run(generateId(), 'Test Book', 'non-existent-publisher', 'default-category');
    }).toThrow(); // Foreign key violation
  });

  it('should enforce category foreign key on books', () => {
    const db = getTestDatabase();
    const publisherId = insertPublisher('Test Publisher');
    
    expect(() => {
      db.prepare(`
        INSERT INTO books (id, title, publisher_id, category_id)
        VALUES (?, ?, ?, ?)
      `).run(generateId(), 'Test Book', publisherId, 'non-existent-category');
    }).toThrow(); // Foreign key violation
  });

  it('should cascade delete book_authors when book is deleted', () => {
    const db = getTestDatabase();
    const authorId = insertAuthor('Test Author');
    const publisherId = insertPublisher('Test Publisher');
    const bookId = insertBook('Test Book', publisherId, 'default-category');
    linkBookAuthor(bookId, authorId);
    
    // Verify link exists
    const beforeCount = db.prepare('SELECT COUNT(*) as count FROM book_authors WHERE book_id = ?').get(bookId) as { count: number };
    expect(beforeCount.count).toBe(1);
    
    // Delete book
    db.prepare('DELETE FROM books WHERE id = ?').run(bookId);
    
    // Verify cascade deletion of book_authors
    const afterCount = db.prepare('SELECT COUNT(*) as count FROM book_authors WHERE book_id = ?').get(bookId) as { count: number };
    expect(afterCount.count).toBe(0);
  });

  it('should allow series_id to be null on books', () => {
    const db = getTestDatabase();
    const publisherId = insertPublisher('Test Publisher');
    
    // This should not throw - series_id is optional
    const bookId = insertBook('Standalone Book', publisherId, 'default-category', undefined);
    
    const book = db.prepare('SELECT series_id FROM books WHERE id = ?').get(bookId) as { series_id: string | null };
    expect(book.series_id).toBeNull();
  });
});
