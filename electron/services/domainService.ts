/**
 * Domain Service - Central enforcement of business rules
 * 
 * Business Rules Enforced:
 * 1. Author must have ≥1 book (cannot exist without books)
 * 2. Publisher must have ≥1 book (cannot exist without books)
 * 3. Series must have ≥1 book AND ≥1 author
 * 4. Book must have exactly 1 publisher and 1 category
 * 5. Book can have 0..* authors, genres, topics
 * 6. Book can have 0..1 series
 */

import { getDatabase, transaction } from '../database/connection';

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

// ============================================================================
// Domain Service
// ============================================================================

export class DomainService {
  /**
   * Check database integrity and return all violations
   */
  integrityCheck(): IntegrityCheckResult {
    const db = getDatabase();
    const violations: IntegrityViolation[] = [];

    // Find orphan authors (authors with 0 books)
    const orphanAuthors = db.prepare(`
      SELECT a.id, a.name FROM authors a
      LEFT JOIN book_authors ba ON a.id = ba.author_id
      WHERE ba.book_id IS NULL
    `).all() as Array<{ id: string; name: string }>;

    for (const author of orphanAuthors) {
      violations.push({
        type: 'orphan_author',
        entityType: 'Author',
        entityId: author.id,
        entityName: author.name,
        message: `Author "${author.name}" has no books (violates: each author must have at least 1 book)`,
      });
    }

    // Find orphan publishers (publishers with 0 books)
    const orphanPublishers = db.prepare(`
      SELECT p.id, p.name FROM publishers p
      LEFT JOIN books b ON p.id = b.publisher_id
      WHERE b.id IS NULL
    `).all() as Array<{ id: string; name: string }>;

    for (const publisher of orphanPublishers) {
      violations.push({
        type: 'orphan_publisher',
        entityType: 'Publisher',
        entityId: publisher.id,
        entityName: publisher.name,
        message: `Publisher "${publisher.name}" has no books (violates: each publisher must have at least 1 book)`,
      });
    }

    // Find orphan series (series with 0 books)
    const orphanSeries = db.prepare(`
      SELECT s.id, s.name FROM series s
      LEFT JOIN books b ON s.id = b.series_id
      WHERE b.id IS NULL
    `).all() as Array<{ id: string; name: string }>;

    for (const series of orphanSeries) {
      violations.push({
        type: 'orphan_series',
        entityType: 'Series',
        entityId: series.id,
        entityName: series.name,
        message: `Series "${series.name}" has no books (violates: each series must have at least 1 book)`,
      });
    }

    // Find series with no authors
    const seriesNoAuthors = db.prepare(`
      SELECT s.id, s.name FROM series s
      LEFT JOIN series_authors sa ON s.id = sa.series_id
      WHERE sa.author_id IS NULL
    `).all() as Array<{ id: string; name: string }>;

    for (const series of seriesNoAuthors) {
      violations.push({
        type: 'series_no_authors',
        entityType: 'Series',
        entityId: series.id,
        entityName: series.name,
        message: `Series "${series.name}" has no authors (violates: each series must have at least 1 author)`,
      });
    }

    // Find books with no publisher (shouldn't happen with NOT NULL but check anyway)
    const booksNoPublisher = db.prepare(`
      SELECT b.id, b.title FROM books b
      LEFT JOIN publishers p ON b.publisher_id = p.id
      WHERE p.id IS NULL
    `).all() as Array<{ id: string; title: string }>;

    for (const book of booksNoPublisher) {
      violations.push({
        type: 'book_no_publisher',
        entityType: 'Book',
        entityId: book.id,
        entityName: book.title,
        message: `Book "${book.title}" has no valid publisher`,
      });
    }

    // Find books with no category
    const booksNoCategory = db.prepare(`
      SELECT b.id, b.title FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE c.id IS NULL
    `).all() as Array<{ id: string; title: string }>;

    for (const book of booksNoCategory) {
      violations.push({
        type: 'book_no_category',
        entityType: 'Book',
        entityId: book.id,
        entityName: book.title,
        message: `Book "${book.title}" has no valid category`,
      });
    }

    return {
      isValid: violations.length === 0,
      violations,
      summary: {
        orphanAuthors: orphanAuthors.length,
        orphanPublishers: orphanPublishers.length,
        orphanSeries: orphanSeries.length,
        seriesWithNoAuthors: seriesNoAuthors.length,
        booksWithNoPublisher: booksNoPublisher.length,
        booksWithNoCategory: booksNoCategory.length,
      },
    };
  }

  /**
   * Check if deleting a book would orphan any entities
   * Returns list of entities that would be orphaned
   */
  checkBookDeletionImpact(bookId: string): {
    canDelete: boolean;
    orphanedAuthors: Array<{ id: string; name: string }>;
    orphanedPublisher: { id: string; name: string } | null;
    orphanedSeries: { id: string; name: string } | null;
    message: string | null;
  } {
    const db = getDatabase();

    // Get book details
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId) as any;
    if (!book) {
      return {
        canDelete: false,
        orphanedAuthors: [],
        orphanedPublisher: null,
        orphanedSeries: null,
        message: 'Book not found',
      };
    }

    // Check for authors that would be orphaned
    const orphanedAuthors = db.prepare(`
      SELECT a.id, a.name FROM authors a
      JOIN book_authors ba ON a.id = ba.author_id
      WHERE ba.book_id = ?
      AND (SELECT COUNT(*) FROM book_authors ba2 WHERE ba2.author_id = a.id) = 1
    `).all(bookId) as Array<{ id: string; name: string }>;

    // Check if publisher would be orphaned
    const publisherBookCount = (db.prepare(`
      SELECT COUNT(*) as count FROM books WHERE publisher_id = ?
    `).get(book.publisher_id) as any).count;

    let orphanedPublisher: { id: string; name: string } | null = null;
    if (publisherBookCount === 1) {
      const publisher = db.prepare('SELECT id, name FROM publishers WHERE id = ?').get(book.publisher_id) as any;
      orphanedPublisher = publisher ? { id: publisher.id, name: publisher.name } : null;
    }

    // Check if series would be orphaned
    let orphanedSeries: { id: string; name: string } | null = null;
    if (book.series_id) {
      const seriesBookCount = (db.prepare(`
        SELECT COUNT(*) as count FROM books WHERE series_id = ?
      `).get(book.series_id) as any).count;

      if (seriesBookCount === 1) {
        const series = db.prepare('SELECT id, name FROM series WHERE id = ?').get(book.series_id) as any;
        orphanedSeries = series ? { id: series.id, name: series.name } : null;
      }
    }

    const problems: string[] = [];
    if (orphanedAuthors.length > 0) {
      problems.push(`${orphanedAuthors.length} author(s) would have no books: ${orphanedAuthors.map(a => a.name).join(', ')}`);
    }
    if (orphanedPublisher) {
      problems.push(`Publisher "${orphanedPublisher.name}" would have no books`);
    }
    if (orphanedSeries) {
      problems.push(`Series "${orphanedSeries.name}" would have no books`);
    }

    const canDelete = problems.length === 0;

    return {
      canDelete,
      orphanedAuthors,
      orphanedPublisher,
      orphanedSeries,
      message: canDelete ? null : `Cannot delete book: ${problems.join('; ')}. Please reassign or delete these entities first.`,
    };
  }

  /**
   * Check if deleting an author would leave any series without authors
   * Returns list of series that would have no authors after deletion
   */
  checkAuthorDeleteImpact(authorId: string): {
    hasImpact: boolean;
    seriesWithNoAuthors: Array<{ id: string; name: string }>;
  } {
    const db = getDatabase();

    // Find series where this author is the ONLY author
    const seriesWithNoAuthors = db.prepare(`
      SELECT s.id, s.name FROM series s
      JOIN series_authors sa ON s.id = sa.series_id
      WHERE sa.author_id = ?
      AND (SELECT COUNT(*) FROM series_authors sa2 WHERE sa2.series_id = s.id) = 1
    `).all(authorId) as Array<{ id: string; name: string }>;

    return {
      hasImpact: seriesWithNoAuthors.length > 0,
      seriesWithNoAuthors,
    };
  }

  /**
   * Delete a book with cascade cleanup option
   * @param bookId - The book to delete
   * @param cleanupOrphans - If true, also delete orphaned authors/publishers/series
   */
  deleteBookWithCascade(
    bookId: string,
    cleanupOrphans: boolean = false
  ): { success: boolean; message: string; deletedEntities: string[] } {
    const db = getDatabase();
    const deletedEntities: string[] = [];

    const impact = this.checkBookDeletionImpact(bookId);

    if (!impact.canDelete && !cleanupOrphans) {
      return {
        success: false,
        message: impact.message || 'Cannot delete book due to business rule violations',
        deletedEntities: [],
      };
    }

    return transaction(() => {
      // Get book title for message
      const book = db.prepare('SELECT title FROM books WHERE id = ?').get(bookId) as any;
      if (!book) {
        throw new Error('Book not found');
      }

      // Delete book relationships first
      db.prepare('DELETE FROM book_authors WHERE book_id = ?').run(bookId);
      db.prepare('DELETE FROM book_genres WHERE book_id = ?').run(bookId);
      db.prepare('DELETE FROM book_topics WHERE book_id = ?').run(bookId);

      // Delete the book
      db.prepare('DELETE FROM books WHERE id = ?').run(bookId);
      deletedEntities.push(`Book: ${book.title}`);

      // Clean up orphans if requested
      if (cleanupOrphans) {
        for (const author of impact.orphanedAuthors) {
          db.prepare('DELETE FROM series_authors WHERE author_id = ?').run(author.id);
          db.prepare('DELETE FROM authors WHERE id = ?').run(author.id);
          deletedEntities.push(`Author: ${author.name}`);
        }

        if (impact.orphanedPublisher) {
          db.prepare('DELETE FROM publishers WHERE id = ?').run(impact.orphanedPublisher.id);
          deletedEntities.push(`Publisher: ${impact.orphanedPublisher.name}`);
        }

        if (impact.orphanedSeries) {
          db.prepare('DELETE FROM series_authors WHERE series_id = ?').run(impact.orphanedSeries.id);
          db.prepare('DELETE FROM series WHERE id = ?').run(impact.orphanedSeries.id);
          deletedEntities.push(`Series: ${impact.orphanedSeries.name}`);
        }
      }

      return {
        success: true,
        message: `Successfully deleted: ${deletedEntities.join(', ')}`,
        deletedEntities,
      };
    });
  }

  /**
   * Get count of books for an author
   */
  getAuthorBookCount(authorId: string): number {
    const db = getDatabase();
    return (db.prepare('SELECT COUNT(*) as count FROM book_authors WHERE author_id = ?').get(authorId) as any).count;
  }

  /**
   * Get count of books for a publisher  
   */
  getPublisherBookCount(publisherId: string): number {
    const db = getDatabase();
    return (db.prepare('SELECT COUNT(*) as count FROM books WHERE publisher_id = ?').get(publisherId) as any).count;
  }

  /**
   * Get count of books for a series
   */
  getSeriesBookCount(seriesId: string): number {
    const db = getDatabase();
    return (db.prepare('SELECT COUNT(*) as count FROM books WHERE series_id = ?').get(seriesId) as any).count;
  }

  /**
   * Check if an author can be deleted (has no books)
   */
  canDeleteAuthor(authorId: string): { canDelete: boolean; message: string | null; bookCount: number } {
    const bookCount = this.getAuthorBookCount(authorId);
    if (bookCount > 0) {
      return {
        canDelete: false,
        message: `Cannot delete author: they have ${bookCount} book(s). Remove the author from all books first.`,
        bookCount,
      };
    }
    return { canDelete: true, message: null, bookCount: 0 };
  }

  /**
   * Check if a publisher can be deleted (has no books)
   */
  canDeletePublisher(publisherId: string): { canDelete: boolean; message: string | null; bookCount: number } {
    const bookCount = this.getPublisherBookCount(publisherId);
    if (bookCount > 0) {
      return {
        canDelete: false,
        message: `Cannot delete publisher: they have ${bookCount} book(s). Reassign books to another publisher first.`,
        bookCount,
      };
    }
    return { canDelete: true, message: null, bookCount: 0 };
  }

  /**
   * Check if a series can be deleted (has no books)
   */
  canDeleteSeries(seriesId: string): { canDelete: boolean; message: string | null; bookCount: number } {
    const bookCount = this.getSeriesBookCount(seriesId);
    if (bookCount > 0) {
      return {
        canDelete: false,
        message: `Cannot delete series: it has ${bookCount} book(s). Remove books from the series first.`,
        bookCount,
      };
    }
    return { canDelete: true, message: null, bookCount: 0 };
  }

  /**
   * Clean up all orphan entities (for maintenance/repair)
   */
  cleanupOrphans(): {
    deletedAuthors: string[];
    deletedPublishers: string[];
    deletedSeries: string[];
  } {
    const db = getDatabase();

    return transaction(() => {
      // Delete orphan authors
      const orphanAuthors = db.prepare(`
        SELECT a.id, a.name FROM authors a
        LEFT JOIN book_authors ba ON a.id = ba.author_id
        WHERE ba.book_id IS NULL
      `).all() as Array<{ id: string; name: string }>;

      for (const author of orphanAuthors) {
        db.prepare('DELETE FROM series_authors WHERE author_id = ?').run(author.id);
        db.prepare('DELETE FROM authors WHERE id = ?').run(author.id);
      }

      // Delete orphan publishers
      const orphanPublishers = db.prepare(`
        SELECT p.id, p.name FROM publishers p
        LEFT JOIN books b ON p.id = b.publisher_id
        WHERE b.id IS NULL
      `).all() as Array<{ id: string; name: string }>;

      for (const publisher of orphanPublishers) {
        db.prepare('DELETE FROM publishers WHERE id = ?').run(publisher.id);
      }

      // Delete orphan series
      const orphanSeries = db.prepare(`
        SELECT s.id, s.name FROM series s
        LEFT JOIN books b ON s.id = b.series_id
        WHERE b.id IS NULL
      `).all() as Array<{ id: string; name: string }>;

      for (const series of orphanSeries) {
        db.prepare('DELETE FROM series_authors WHERE series_id = ?').run(series.id);
        db.prepare('DELETE FROM series WHERE id = ?').run(series.id);
      }

      return {
        deletedAuthors: orphanAuthors.map(a => a.name),
        deletedPublishers: orphanPublishers.map(p => p.name),
        deletedSeries: orphanSeries.map(s => s.name),
      };
    });
  }
}

export const domainService = new DomainService();
