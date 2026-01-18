import { v4 as uuidv4 } from 'uuid';
import { getDatabase, transaction } from '../database/connection';
import type {
  Book,
  BookInput,
  BookSearchParams,
  BookWithRelations,
  PaginatedResponse,
  Author,
  Publisher,
  Series,
  Category,
  Genre,
  Topic,
  ReadingProgressUpdate,
} from '../../src/shared/types';

export class BookRepository {
  create(input: BookInput): BookWithRelations {
    const db = getDatabase();
    const id = input.id || uuidv4();
    const now = new Date().toISOString();

    return transaction(() => {
      // Insert book
      const stmt = db.prepare(`
        INSERT INTO books (
          id, title, isbn, publication_year, pages, description, cover_image,
          reading_status, notes, rating, publisher_id, series_id, series_order,
          category_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        input.title,
        input.isbn || null,
        input.publicationYear || null,
        input.pages || null,
        input.description || null,
        input.coverImage || null,
        input.readingStatus || 'unread',
        input.notes || null,
        input.rating || null,
        input.publisherId,
        input.seriesId || null,
        input.seriesOrder || null,
        input.categoryId,
        now,
        now
      );

      // Insert book-author relationships
      if (input.authorIds && input.authorIds.length > 0) {
        const authorStmt = db.prepare('INSERT INTO book_authors (book_id, author_id) VALUES (?, ?)');
        for (const authorId of input.authorIds) {
          authorStmt.run(id, authorId);
        }
      }

      // Insert book-genre relationships
      if (input.genreIds && input.genreIds.length > 0) {
        const genreStmt = db.prepare('INSERT INTO book_genres (book_id, genre_id) VALUES (?, ?)');
        for (const genreId of input.genreIds) {
          genreStmt.run(id, genreId);
        }
      }

      // Insert book-topic relationships
      if (input.topicIds && input.topicIds.length > 0) {
        const topicStmt = db.prepare('INSERT INTO book_topics (book_id, topic_id) VALUES (?, ?)');
        for (const topicId of input.topicIds) {
          topicStmt.run(id, topicId);
        }
      }

      return this.findByIdWithRelations(id)!;
    });
  }

  update(id: string, input: BookInput, options?: { cleanupOrphans?: boolean }): BookWithRelations {
    const db = getDatabase();
    const now = new Date().toISOString();
    const cleanupOrphans = options?.cleanupOrphans ?? false;

    return transaction(() => {
      // Check for entities that would be orphaned by this update
      const impact = this.checkUpdateImpact(id, input);

      // Update book
      const stmt = db.prepare(`
        UPDATE books SET
          title = ?, isbn = ?, publication_year = ?, pages = ?, description = ?,
          cover_image = ?, reading_status = ?, notes = ?, rating = ?,
          publisher_id = ?, series_id = ?, series_order = ?, category_id = ?,
          updated_at = ?
        WHERE id = ?
      `);

      const result = stmt.run(
        input.title,
        input.isbn || null,
        input.publicationYear || null,
        input.pages || null,
        input.description || null,
        input.coverImage || null,
        input.readingStatus || 'unread',
        input.notes || null,
        input.rating || null,
        input.publisherId,
        input.seriesId || null,
        input.seriesOrder || null,
        input.categoryId,
        now,
        id
      );

      if (result.changes === 0) {
        throw new Error(`Book with id ${id} not found`);
      }

      // Update book-author relationships
      db.prepare('DELETE FROM book_authors WHERE book_id = ?').run(id);
      if (input.authorIds && input.authorIds.length > 0) {
        const authorStmt = db.prepare('INSERT INTO book_authors (book_id, author_id) VALUES (?, ?)');
        for (const authorId of input.authorIds) {
          authorStmt.run(id, authorId);
        }
      }

      // Update book-genre relationships
      db.prepare('DELETE FROM book_genres WHERE book_id = ?').run(id);
      if (input.genreIds && input.genreIds.length > 0) {
        const genreStmt = db.prepare('INSERT INTO book_genres (book_id, genre_id) VALUES (?, ?)');
        for (const genreId of input.genreIds) {
          genreStmt.run(id, genreId);
        }
      }

      // Update book-topic relationships
      db.prepare('DELETE FROM book_topics WHERE book_id = ?').run(id);
      if (input.topicIds && input.topicIds.length > 0) {
        const topicStmt = db.prepare('INSERT INTO book_topics (book_id, topic_id) VALUES (?, ?)');
        for (const topicId of input.topicIds) {
          topicStmt.run(id, topicId);
        }
      }

      // Clean up orphans if requested
      if (cleanupOrphans && impact.hasImpact) {
        for (const author of impact.orphanedAuthors) {
          db.prepare('DELETE FROM series_authors WHERE author_id = ?').run(author.id);
          db.prepare('DELETE FROM authors WHERE id = ?').run(author.id);
        }

        if (impact.orphanedPublisher) {
          db.prepare('DELETE FROM publishers WHERE id = ?').run(impact.orphanedPublisher.id);
        }

        if (impact.orphanedSeries) {
          db.prepare('DELETE FROM series_authors WHERE series_id = ?').run(impact.orphanedSeries.id);
          db.prepare('DELETE FROM series WHERE id = ?').run(impact.orphanedSeries.id);
        }
      }

      return this.findByIdWithRelations(id)!;
    });
  }

  updateReadingProgress(update: ReadingProgressUpdate): Book {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE books SET
        reading_status = ?,
        notes = COALESCE(?, notes),
        updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(update.readingStatus, update.notes || null, now, update.bookId);

    if (result.changes === 0) {
      throw new Error(`Book with id ${update.bookId} not found`);
    }

    return this.findById(update.bookId)!;
  }

  delete(id: string, options?: { cleanupOrphans?: boolean }): void {
    const db = getDatabase();
    const cleanupOrphans = options?.cleanupOrphans ?? false;

    transaction(() => {
      // Get book info first
      const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id) as any;
      if (!book) {
        throw new Error(`Book with id ${id} not found`);
      }

      // Check for entities that would be orphaned by this deletion
      // 1. Check authors - would any author be left with 0 books?
      const orphanedAuthors = db.prepare(`
        SELECT a.id, a.name FROM authors a
        JOIN book_authors ba ON a.id = ba.author_id
        WHERE ba.book_id = ?
        AND (SELECT COUNT(*) FROM book_authors ba2 WHERE ba2.author_id = a.id) = 1
      `).all(id) as Array<{ id: string; name: string }>;

      // 2. Check publisher - would the publisher be left with 0 books?
      const publisherBookCount = (db.prepare(`
        SELECT COUNT(*) as count FROM books WHERE publisher_id = ?
      `).get(book.publisher_id) as any).count;
      
      let orphanedPublisher: { id: string; name: string } | null = null;
      if (publisherBookCount === 1) {
        const publisher = db.prepare('SELECT id, name FROM publishers WHERE id = ?').get(book.publisher_id) as any;
        if (publisher) {
          orphanedPublisher = { id: publisher.id, name: publisher.name };
        }
      }

      // 3. Check series - would the series be left with 0 books?
      let orphanedSeries: { id: string; name: string } | null = null;
      if (book.series_id) {
        const seriesBookCount = (db.prepare(`
          SELECT COUNT(*) as count FROM books WHERE series_id = ?
        `).get(book.series_id) as any).count;
        
        if (seriesBookCount === 1) {
          const series = db.prepare('SELECT id, name FROM series WHERE id = ?').get(book.series_id) as any;
          if (series) {
            orphanedSeries = { id: series.id, name: series.name };
          }
        }
      }

      // If there are orphans and cleanup is not enabled, block deletion
      if (!cleanupOrphans && (orphanedAuthors.length > 0 || orphanedPublisher || orphanedSeries)) {
        const problems: string[] = [];
        if (orphanedAuthors.length > 0) {
          problems.push(`Author(s) "${orphanedAuthors.map(a => a.name).join(', ')}" would have no books`);
        }
        if (orphanedPublisher) {
          problems.push(`Publisher "${orphanedPublisher.name}" would have no books`);
        }
        if (orphanedSeries) {
          problems.push(`Series "${orphanedSeries.name}" would have no books`);
        }
        throw new Error(
          `Cannot delete this book because it would violate business rules:\n• ${problems.join('\n• ')}\n\n` +
          `Please reassign these entities to other books first, or delete the book with the "Also delete orphaned entities" option.`
        );
      }

      // Delete book relationships
      db.prepare('DELETE FROM book_authors WHERE book_id = ?').run(id);
      db.prepare('DELETE FROM book_genres WHERE book_id = ?').run(id);
      db.prepare('DELETE FROM book_topics WHERE book_id = ?').run(id);

      // Delete book
      db.prepare('DELETE FROM books WHERE id = ?').run(id);

      // Clean up orphans if requested
      if (cleanupOrphans) {
        for (const author of orphanedAuthors) {
          db.prepare('DELETE FROM series_authors WHERE author_id = ?').run(author.id);
          db.prepare('DELETE FROM authors WHERE id = ?').run(author.id);
        }

        if (orphanedPublisher) {
          db.prepare('DELETE FROM publishers WHERE id = ?').run(orphanedPublisher.id);
        }

        if (orphanedSeries) {
          db.prepare('DELETE FROM series_authors WHERE series_id = ?').run(orphanedSeries.id);
          db.prepare('DELETE FROM series WHERE id = ?').run(orphanedSeries.id);
        }
      }
    });
  }

  /**
   * Check what entities would be orphaned if this book is deleted
   */
  checkDeleteImpact(id: string): {
    orphanedAuthors: Array<{ id: string; name: string }>;
    orphanedPublisher: { id: string; name: string } | null;
    orphanedSeries: { id: string; name: string } | null;
    hasImpact: boolean;
  } {
    const db = getDatabase();
    
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id) as any;
    if (!book) {
      return { orphanedAuthors: [], orphanedPublisher: null, orphanedSeries: null, hasImpact: false };
    }

    const orphanedAuthors = db.prepare(`
      SELECT a.id, a.name FROM authors a
      JOIN book_authors ba ON a.id = ba.author_id
      WHERE ba.book_id = ?
      AND (SELECT COUNT(*) FROM book_authors ba2 WHERE ba2.author_id = a.id) = 1
    `).all(id) as Array<{ id: string; name: string }>;

    const publisherBookCount = (db.prepare(`
      SELECT COUNT(*) as count FROM books WHERE publisher_id = ?
    `).get(book.publisher_id) as any).count;
    
    let orphanedPublisher: { id: string; name: string } | null = null;
    if (publisherBookCount === 1) {
      const publisher = db.prepare('SELECT id, name FROM publishers WHERE id = ?').get(book.publisher_id) as any;
      if (publisher) {
        orphanedPublisher = { id: publisher.id, name: publisher.name };
      }
    }

    let orphanedSeries: { id: string; name: string } | null = null;
    if (book.series_id) {
      const seriesBookCount = (db.prepare(`
        SELECT COUNT(*) as count FROM books WHERE series_id = ?
      `).get(book.series_id) as any).count;
      
      if (seriesBookCount === 1) {
        const series = db.prepare('SELECT id, name FROM series WHERE id = ?').get(book.series_id) as any;
        if (series) {
          orphanedSeries = { id: series.id, name: series.name };
        }
      }
    }

    return {
      orphanedAuthors,
      orphanedPublisher,
      orphanedSeries,
      hasImpact: orphanedAuthors.length > 0 || orphanedPublisher !== null || orphanedSeries !== null,
    };
  }

  /**
   * Check what entities would be orphaned if this book is updated with the given input.
   * This checks if changing publisher, authors, or series would leave the old entities without any books.
   */
  checkUpdateImpact(id: string, input: BookInput): {
    orphanedAuthors: Array<{ id: string; name: string }>;
    orphanedPublisher: { id: string; name: string } | null;
    orphanedSeries: { id: string; name: string } | null;
    hasImpact: boolean;
  } {
    const db = getDatabase();
    
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id) as any;
    if (!book) {
      return { orphanedAuthors: [], orphanedPublisher: null, orphanedSeries: null, hasImpact: false };
    }

    // Get current authors for this book
    const currentAuthorIds = (db.prepare(`
      SELECT author_id FROM book_authors WHERE book_id = ?
    `).all(id) as Array<{ author_id: string }>).map(r => r.author_id);

    // Check which authors are being removed and would become orphaned
    const removedAuthorIds = currentAuthorIds.filter(aid => !(input.authorIds || []).includes(aid));
    const orphanedAuthors: Array<{ id: string; name: string }> = [];
    
    for (const authorId of removedAuthorIds) {
      // Check if this author only has this one book
      const authorBookCount = (db.prepare(`
        SELECT COUNT(*) as count FROM book_authors WHERE author_id = ?
      `).get(authorId) as any).count;
      
      if (authorBookCount === 1) {
        const author = db.prepare('SELECT id, name FROM authors WHERE id = ?').get(authorId) as any;
        if (author) {
          orphanedAuthors.push({ id: author.id, name: author.name });
        }
      }
    }

    // Check if publisher is changing and old publisher would be orphaned
    let orphanedPublisher: { id: string; name: string } | null = null;
    if (input.publisherId && input.publisherId !== book.publisher_id) {
      const oldPublisherBookCount = (db.prepare(`
        SELECT COUNT(*) as count FROM books WHERE publisher_id = ?
      `).get(book.publisher_id) as any).count;
      
      if (oldPublisherBookCount === 1) {
        const publisher = db.prepare('SELECT id, name FROM publishers WHERE id = ?').get(book.publisher_id) as any;
        if (publisher) {
          orphanedPublisher = { id: publisher.id, name: publisher.name };
        }
      }
    }

    // Check if series is changing and old series would be orphaned
    let orphanedSeries: { id: string; name: string } | null = null;
    if (book.series_id && input.seriesId !== book.series_id) {
      const oldSeriesBookCount = (db.prepare(`
        SELECT COUNT(*) as count FROM books WHERE series_id = ?
      `).get(book.series_id) as any).count;
      
      if (oldSeriesBookCount === 1) {
        const series = db.prepare('SELECT id, name FROM series WHERE id = ?').get(book.series_id) as any;
        if (series) {
          orphanedSeries = { id: series.id, name: series.name };
        }
      }
    }

    return {
      orphanedAuthors,
      orphanedPublisher,
      orphanedSeries,
      hasImpact: orphanedAuthors.length > 0 || orphanedPublisher !== null || orphanedSeries !== null,
    };
  }

  findById(id: string): Book | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM books WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return this.mapRowToBook(row);
  }

  findByIdWithRelations(id: string): BookWithRelations | null {
    const db = getDatabase();
    const bookStmt = db.prepare('SELECT * FROM books WHERE id = ?');
    const bookRow = bookStmt.get(id) as any;

    if (!bookRow) return null;

    return this.enrichBookWithRelations(bookRow);
  }

  findAll(): BookWithRelations[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM books ORDER BY created_at DESC');
    const rows = stmt.all() as any[];

    return rows.map(row => this.enrichBookWithRelations(row));
  }

  search(params: BookSearchParams): PaginatedResponse<BookWithRelations> {
    const db = getDatabase();
    let query = 'SELECT DISTINCT b.* FROM books b';
    let countQuery = 'SELECT COUNT(DISTINCT b.id) as total FROM books b';
    const joins: string[] = [];
    const conditions: string[] = [];
    const queryParams: any[] = [];

    // Add joins based on filters
    if (params.authorId) {
      joins.push('JOIN book_authors ba ON b.id = ba.book_id');
      conditions.push('ba.author_id = ?');
      queryParams.push(params.authorId);
    }

    if (params.genreId) {
      joins.push('JOIN book_genres bg ON b.id = bg.book_id');
      conditions.push('bg.genre_id = ?');
      queryParams.push(params.genreId);
    }

    if (params.topicId) {
      joins.push('JOIN book_topics bt ON b.id = bt.book_id');
      conditions.push('bt.topic_id = ?');
      queryParams.push(params.topicId);
    }

    // Add conditions
    if (params.query) {
      // Join with authors to search by author name as well
      // Only add if not already joined for authorId filter
      if (!params.authorId) {
        joins.push('LEFT JOIN book_authors ba_search ON b.id = ba_search.book_id');
        joins.push('LEFT JOIN authors a_search ON ba_search.author_id = a_search.id');
      } else {
        joins.push('LEFT JOIN authors a_search ON ba.author_id = a_search.id');
      }
      // Join with genres to search by genre name
      if (!params.genreId) {
        joins.push('LEFT JOIN book_genres bg_search ON b.id = bg_search.book_id');
        joins.push('LEFT JOIN genres g_search ON bg_search.genre_id = g_search.id');
      } else {
        joins.push('LEFT JOIN genres g_search ON bg.genre_id = g_search.id');
      }
      conditions.push('(b.title LIKE ? OR b.isbn LIKE ? OR b.description LIKE ? OR a_search.name LIKE ? OR g_search.name LIKE ? OR CAST(b.publication_year AS TEXT) LIKE ?)');
      const searchTerm = `%${params.query}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (params.publisherId) {
      conditions.push('b.publisher_id = ?');
      queryParams.push(params.publisherId);
    }

    if (params.seriesId) {
      conditions.push('b.series_id = ?');
      queryParams.push(params.seriesId);
    }

    if (params.categoryId) {
      conditions.push('b.category_id = ?');
      queryParams.push(params.categoryId);
    }

    if (params.readingStatus) {
      conditions.push('b.reading_status = ?');
      queryParams.push(params.readingStatus);
    }

    if (params.yearFrom) {
      conditions.push('b.publication_year >= ?');
      queryParams.push(params.yearFrom);
    }

    if (params.yearTo) {
      conditions.push('b.publication_year <= ?');
      queryParams.push(params.yearTo);
    }

    // Build query
    if (joins.length > 0) {
      query += ' ' + joins.join(' ');
      countQuery += ' ' + joins.join(' ');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }

    // Add sorting
    const sortColumn = this.getSortColumn(params.sortBy || 'createdAt');
    const sortOrder = params.sortOrder === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn} ${sortOrder}`;

    // Add pagination
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    query += ' LIMIT ? OFFSET ?';

    // Execute queries
    const countStmt = db.prepare(countQuery);
    const totalResult = countStmt.get(...queryParams) as { total: number };

    const stmt = db.prepare(query);
    const rows = stmt.all(...queryParams, limit, offset) as any[];

    return {
      items: rows.map(row => this.enrichBookWithRelations(row)),
      total: totalResult.total,
      limit,
      offset,
    };
  }

  private getSortColumn(sortBy: string): string {
    switch (sortBy) {
      case 'title':
        return 'b.title';
      case 'year':
        return 'b.publication_year';
      case 'createdAt':
        return 'b.created_at';
      case 'updatedAt':
        return 'b.updated_at';
      default:
        return 'b.created_at';
    }
  }

  private enrichBookWithRelations(row: any): BookWithRelations {
    const db = getDatabase();
    const bookId = row.id;

    // Get publisher
    const publisherStmt = db.prepare('SELECT * FROM publishers WHERE id = ?');
    const publisherRow = publisherStmt.get(row.publisher_id) as any;

    // Get series
    let series: Series | undefined;
    if (row.series_id) {
      const seriesStmt = db.prepare('SELECT * FROM series WHERE id = ?');
      const seriesRow = seriesStmt.get(row.series_id) as any;
      if (seriesRow) {
        series = {
          id: seriesRow.id,
          name: seriesRow.name,
          description: seriesRow.description || undefined,
          createdAt: seriesRow.created_at,
          updatedAt: seriesRow.updated_at,
        };
      }
    }

    // Get category
    const categoryStmt = db.prepare('SELECT * FROM categories WHERE id = ?');
    const categoryRow = categoryStmt.get(row.category_id) as any;

    // Get authors
    const authorsStmt = db.prepare(`
      SELECT a.* FROM authors a
      JOIN book_authors ba ON a.id = ba.author_id
      WHERE ba.book_id = ?
    `);
    const authorRows = authorsStmt.all(bookId) as any[];

    // Get genres
    const genresStmt = db.prepare(`
      SELECT g.* FROM genres g
      JOIN book_genres bg ON g.id = bg.genre_id
      WHERE bg.book_id = ?
    `);
    const genreRows = genresStmt.all(bookId) as any[];

    // Get topics
    const topicsStmt = db.prepare(`
      SELECT t.* FROM topics t
      JOIN book_topics bt ON t.id = bt.topic_id
      WHERE bt.book_id = ?
    `);
    const topicRows = topicsStmt.all(bookId) as any[];

    return {
      ...this.mapRowToBook(row),
      publisher: publisherRow ? this.mapRowToPublisher(publisherRow) : undefined,
      series,
      category: categoryRow ? this.mapRowToCategory(categoryRow) : undefined,
      authors: authorRows.map(a => this.mapRowToAuthor(a)),
      genres: genreRows.map(g => this.mapRowToGenre(g)),
      topics: topicRows.map(t => this.mapRowToTopic(t)),
    };
  }

  private mapRowToBook(row: any): Book {
    return {
      id: row.id,
      title: row.title,
      isbn: row.isbn || undefined,
      publicationYear: row.publication_year || undefined,
      pages: row.pages || undefined,
      description: row.description || undefined,
      coverImage: row.cover_image || undefined,
      readingStatus: row.reading_status,
      notes: row.notes || undefined,
      rating: row.rating || undefined,
      publisherId: row.publisher_id,
      seriesId: row.series_id || undefined,
      seriesOrder: row.series_order || undefined,
      categoryId: row.category_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToAuthor(row: any): Author {
    return {
      id: row.id,
      name: row.name,
      bio: row.bio || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToPublisher(row: any): Publisher {
    return {
      id: row.id,
      name: row.name,
      location: row.location || undefined,
      website: row.website || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToCategory(row: any): Category {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      color: row.color || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToGenre(row: any): Genre {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToTopic(row: any): Topic {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const bookRepository = new BookRepository();
