import { getDatabase } from '../database/connection';
import { bookRepository } from '../repositories/bookRepository';
import type { LibraryStats, BookWithRelations } from '../../src/shared/types';

export class LibraryService {
  getStats(): LibraryStats {
    const db = getDatabase();

    // Get total counts
    const totalBooks = (db.prepare('SELECT COUNT(*) as count FROM books').get() as any).count;
    const totalAuthors = (db.prepare('SELECT COUNT(*) as count FROM authors').get() as any).count;
    const totalPublishers = (db.prepare('SELECT COUNT(*) as count FROM publishers').get() as any).count;
    const totalSeries = (db.prepare('SELECT COUNT(*) as count FROM series').get() as any).count;
    const totalGenres = (db.prepare('SELECT COUNT(*) as count FROM genres').get() as any).count;
    const totalTopics = (db.prepare('SELECT COUNT(*) as count FROM topics').get() as any).count;
    const totalCategories = (db.prepare('SELECT COUNT(*) as count FROM categories').get() as any).count;

    // Get reading status breakdown
    const statusBreakdown = db.prepare(`
      SELECT reading_status, COUNT(*) as count
      FROM books
      GROUP BY reading_status
    `).all() as any[];

    const readingStatusBreakdown = {
      unread: 0,
      reading: 0,
      completed: 0,
    };

    for (const row of statusBreakdown) {
      if (row.reading_status in readingStatusBreakdown) {
        readingStatusBreakdown[row.reading_status as keyof typeof readingStatusBreakdown] = row.count;
      }
    }

    // Get top genres
    const topGenres = db.prepare(`
      SELECT g.name, COUNT(bg.book_id) as count
      FROM genres g
      JOIN book_genres bg ON g.id = bg.genre_id
      GROUP BY g.id
      ORDER BY count DESC
      LIMIT 5
    `).all() as Array<{ name: string; count: number }>;

    // Get top authors
    const topAuthors = db.prepare(`
      SELECT a.name, COUNT(ba.book_id) as count
      FROM authors a
      JOIN book_authors ba ON a.id = ba.author_id
      GROUP BY a.id
      ORDER BY count DESC
      LIMIT 5
    `).all() as Array<{ name: string; count: number }>;

    // Get recent books
    const recentBooksRows = db.prepare(`
      SELECT * FROM books
      ORDER BY created_at DESC
      LIMIT 5
    `).all() as any[];

    const recentBooks: BookWithRelations[] = recentBooksRows.map(row => 
      bookRepository.findByIdWithRelations(row.id)!
    ).filter(Boolean);

    // Get recommended books (books with reading status 'unread' from genres the user reads most)
    const recommendedBooks = this.getRecommendedBooks();

    return {
      totalBooks,
      totalAuthors,
      totalPublishers,
      totalSeries,
      totalGenres,
      totalTopics,
      totalCategories,
      readingStatusBreakdown,
      topGenres,
      topAuthors,
      recentBooks,
      recommendedBooks,
    };
  }

  private getRecommendedBooks(): BookWithRelations[] {
    const db = getDatabase();

    // Find the most read genres (genres of completed books)
    const favoriteGenres = db.prepare(`
      SELECT bg.genre_id, COUNT(*) as count
      FROM book_genres bg
      JOIN books b ON bg.book_id = b.id
      WHERE b.reading_status = 'completed'
      GROUP BY bg.genre_id
      ORDER BY count DESC
      LIMIT 3
    `).all() as Array<{ genre_id: string; count: number }>;

    if (favoriteGenres.length === 0) {
      // If no completed books, just return some unread books
      const unreadBooks = db.prepare(`
        SELECT * FROM books
        WHERE reading_status = 'unread'
        ORDER BY created_at DESC
        LIMIT 5
      `).all() as any[];

      return unreadBooks.map(row => bookRepository.findByIdWithRelations(row.id)!).filter(Boolean);
    }

    // Find unread books in favorite genres
    const genreIds = favoriteGenres.map(g => g.genre_id);
    const placeholders = genreIds.map(() => '?').join(',');

    const recommendedRows = db.prepare(`
      SELECT DISTINCT b.* FROM books b
      JOIN book_genres bg ON b.id = bg.book_id
      WHERE b.reading_status = 'unread'
      AND bg.genre_id IN (${placeholders})
      ORDER BY b.created_at DESC
      LIMIT 5
    `).all(...genreIds) as any[];

    return recommendedRows.map(row => bookRepository.findByIdWithRelations(row.id)!).filter(Boolean);
  }
}

export const libraryService = new LibraryService();
