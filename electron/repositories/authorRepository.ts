import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import type { Author, AuthorInput, AuthorWithStats } from '../../src/shared/types';

export class AuthorRepository {
  /**
   * Create an author.
   * Note: Per business rules, authors should only be created when associated with a book.
   * This method is called internally during book creation or can be used for inline author creation
   * in the book form (which immediately associates the author with the book being created).
   */
  create(input: AuthorInput): Author {
    const db = getDatabase();
    const id = input.id || uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO authors (id, name, bio, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, input.name, input.bio || null, now, now);

    return this.findById(id)!;
  }

  update(id: string, input: AuthorInput): Author {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE authors
      SET name = ?, bio = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(input.name, input.bio || null, now, id);
    
    if (result.changes === 0) {
      throw new Error(`Author with id ${id} not found`);
    }

    return this.findById(id)!;
  }

  delete(id: string): void {
    const db = getDatabase();
    
    // Business rule: author must have at least one book
    // We can only delete an author if they have 0 books
    const bookCount = (db.prepare('SELECT COUNT(*) as count FROM book_authors WHERE author_id = ?').get(id) as any).count;
    
    if (bookCount > 0) {
      throw new Error(`Cannot delete author: they have ${bookCount} book(s) associated. Remove the author from all books first, or delete those books.`);
    }
    
    // Also remove from any series
    db.prepare('DELETE FROM series_authors WHERE author_id = ?').run(id);
    
    const stmt = db.prepare('DELETE FROM authors WHERE id = ?');
    const result = stmt.run(id);
    
    if (result.changes === 0) {
      throw new Error(`Author with id ${id} not found`);
    }
  }

  findById(id: string): Author | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM authors WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return this.mapRowToAuthor(row);
  }

  findByIdWithStats(id: string): AuthorWithStats | null {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        a.*,
        COUNT(DISTINCT ba.book_id) as book_count,
        COUNT(DISTINCT sa.series_id) as series_count
      FROM authors a
      LEFT JOIN book_authors ba ON a.id = ba.author_id
      LEFT JOIN series_authors sa ON a.id = sa.author_id
      WHERE a.id = ?
      GROUP BY a.id
    `);
    
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return this.mapRowToAuthorWithStats(row);
  }

  findAll(): AuthorWithStats[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        a.*,
        COUNT(DISTINCT ba.book_id) as book_count,
        COUNT(DISTINCT sa.series_id) as series_count
      FROM authors a
      LEFT JOIN book_authors ba ON a.id = ba.author_id
      LEFT JOIN series_authors sa ON a.id = sa.author_id
      GROUP BY a.id
      ORDER BY a.name ASC
    `);
    
    const rows = stmt.all() as any[];
    return rows.map(row => this.mapRowToAuthorWithStats(row));
  }

  findByName(name: string): Author | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM authors WHERE LOWER(name) = LOWER(?)');
    const row = stmt.get(name) as any;
    
    if (!row) return null;
    
    return this.mapRowToAuthor(row);
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

  private mapRowToAuthorWithStats(row: any): AuthorWithStats {
    return {
      ...this.mapRowToAuthor(row),
      bookCount: row.book_count || 0,
      seriesCount: row.series_count || 0,
    };
  }
}

export const authorRepository = new AuthorRepository();
