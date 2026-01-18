import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import type { Genre, GenreInput, GenreWithStats } from '../../src/shared/types';

export class GenreRepository {
  create(input: GenreInput): Genre {
    const db = getDatabase();
    const id = input.id || uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO genres (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, input.name, input.description || null, now, now);

    return this.findById(id)!;
  }

  update(id: string, input: GenreInput): Genre {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE genres
      SET name = ?, description = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(input.name, input.description || null, now, id);
    
    if (result.changes === 0) {
      throw new Error(`Genre with id ${id} not found`);
    }

    return this.findById(id)!;
  }

  delete(id: string): void {
    const db = getDatabase();
    
    const stmt = db.prepare('DELETE FROM genres WHERE id = ?');
    const result = stmt.run(id);
    
    if (result.changes === 0) {
      throw new Error(`Genre with id ${id} not found`);
    }
  }

  findById(id: string): Genre | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM genres WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return this.mapRowToGenre(row);
  }

  findByIdWithStats(id: string): GenreWithStats | null {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        g.*,
        COUNT(bg.book_id) as book_count
      FROM genres g
      LEFT JOIN book_genres bg ON g.id = bg.genre_id
      WHERE g.id = ?
      GROUP BY g.id
    `);
    
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return this.mapRowToGenreWithStats(row);
  }

  findAll(): GenreWithStats[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        g.*,
        COUNT(bg.book_id) as book_count
      FROM genres g
      LEFT JOIN book_genres bg ON g.id = bg.genre_id
      GROUP BY g.id
      ORDER BY g.name ASC
    `);
    
    const rows = stmt.all() as any[];
    return rows.map(row => this.mapRowToGenreWithStats(row));
  }

  findByName(name: string): Genre | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM genres WHERE LOWER(name) = LOWER(?)');
    const row = stmt.get(name) as any;
    
    if (!row) return null;
    
    return this.mapRowToGenre(row);
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

  private mapRowToGenreWithStats(row: any): GenreWithStats {
    return {
      ...this.mapRowToGenre(row),
      bookCount: row.book_count || 0,
    };
  }
}

export const genreRepository = new GenreRepository();
