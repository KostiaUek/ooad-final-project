import { v4 as uuidv4 } from 'uuid';
import { getDatabase, transaction } from '../database/connection';
import type { Series, SeriesInput, SeriesWithAuthors, Author } from '../../src/shared/types';

export class SeriesRepository {
  create(input: SeriesInput): Series {
    const db = getDatabase();
    const id = input.id || uuidv4();
    const now = new Date().toISOString();

    return transaction(() => {
      // Insert series
      const stmt = db.prepare(`
        INSERT INTO series (id, name, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(id, input.name, input.description || null, now, now);

      // Insert series-author relationships (business rule: series must have at least one author)
      if (input.authorIds && input.authorIds.length > 0) {
        const authorStmt = db.prepare(`
          INSERT INTO series_authors (series_id, author_id)
          VALUES (?, ?)
        `);
        for (const authorId of input.authorIds) {
          authorStmt.run(id, authorId);
        }
      }

      return this.findById(id)!;
    });
  }

  update(id: string, input: SeriesInput): Series {
    const db = getDatabase();
    const now = new Date().toISOString();

    return transaction(() => {
      // Update series
      const stmt = db.prepare(`
        UPDATE series
        SET name = ?, description = ?, updated_at = ?
        WHERE id = ?
      `);
      const result = stmt.run(input.name, input.description || null, now, id);
      
      if (result.changes === 0) {
        throw new Error(`Series with id ${id} not found`);
      }

      // Update series-author relationships
      db.prepare('DELETE FROM series_authors WHERE series_id = ?').run(id);
      
      if (input.authorIds && input.authorIds.length > 0) {
        const authorStmt = db.prepare(`
          INSERT INTO series_authors (series_id, author_id)
          VALUES (?, ?)
        `);
        for (const authorId of input.authorIds) {
          authorStmt.run(id, authorId);
        }
      }

      return this.findById(id)!;
    });
  }

  delete(id: string): void {
    const db = getDatabase();
    
    // Check if series has books
    const bookCheck = db.prepare('SELECT COUNT(*) as count FROM books WHERE series_id = ?');
    const bookCount = (bookCheck.get(id) as any).count;
    
    if (bookCount > 0) {
      throw new Error(`Cannot delete series: it has ${bookCount} book(s) associated with it`);
    }
    
    transaction(() => {
      // Delete series-author relationships
      db.prepare('DELETE FROM series_authors WHERE series_id = ?').run(id);
      
      // Delete series
      const stmt = db.prepare('DELETE FROM series WHERE id = ?');
      const result = stmt.run(id);
      
      if (result.changes === 0) {
        throw new Error(`Series with id ${id} not found`);
      }
    });
  }

  findById(id: string): Series | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM series WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return this.mapRowToSeries(row);
  }

  findByIdWithAuthors(id: string): SeriesWithAuthors | null {
    const db = getDatabase();
    const seriesStmt = db.prepare(`
      SELECT 
        s.*,
        COUNT(DISTINCT b.id) as book_count
      FROM series s
      LEFT JOIN books b ON s.id = b.series_id
      WHERE s.id = ?
      GROUP BY s.id
    `);
    
    const seriesRow = seriesStmt.get(id) as any;
    
    if (!seriesRow) return null;
    
    // Get authors for this series
    const authorsStmt = db.prepare(`
      SELECT a.* FROM authors a
      JOIN series_authors sa ON a.id = sa.author_id
      WHERE sa.series_id = ?
    `);
    const authorRows = authorsStmt.all(id) as any[];
    
    return this.mapRowToSeriesWithAuthors(seriesRow, authorRows);
  }

  findAll(): SeriesWithAuthors[] {
    const db = getDatabase();
    const seriesStmt = db.prepare(`
      SELECT 
        s.*,
        COUNT(DISTINCT b.id) as book_count
      FROM series s
      LEFT JOIN books b ON s.id = b.series_id
      GROUP BY s.id
      ORDER BY s.name ASC
    `);
    
    const seriesRows = seriesStmt.all() as any[];
    
    return seriesRows.map(seriesRow => {
      const authorsStmt = db.prepare(`
        SELECT a.* FROM authors a
        JOIN series_authors sa ON a.id = sa.author_id
        WHERE sa.series_id = ?
      `);
      const authorRows = authorsStmt.all(seriesRow.id) as any[];
      return this.mapRowToSeriesWithAuthors(seriesRow, authorRows);
    });
  }

  findByName(name: string): Series | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM series WHERE LOWER(name) = LOWER(?)');
    const row = stmt.get(name) as any;
    
    if (!row) return null;
    
    return this.mapRowToSeries(row);
  }

  private mapRowToSeries(row: any): Series {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToSeriesWithAuthors(row: any, authorRows: any[]): SeriesWithAuthors {
    const authors: Author[] = authorRows.map(a => ({
      id: a.id,
      name: a.name,
      bio: a.bio || undefined,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    }));

    return {
      ...this.mapRowToSeries(row),
      authors,
      bookCount: row.book_count || 0,
    };
  }
}

export const seriesRepository = new SeriesRepository();
