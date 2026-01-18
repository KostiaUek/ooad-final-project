import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import type { Publisher, PublisherInput, PublisherWithStats } from '../../src/shared/types';

export class PublisherRepository {
  create(input: PublisherInput): Publisher {
    const db = getDatabase();
    const id = input.id || uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO publishers (id, name, location, website, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, input.name, input.location || null, input.website || null, now, now);

    return this.findById(id)!;
  }

  update(id: string, input: PublisherInput): Publisher {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE publishers
      SET name = ?, location = ?, website = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(input.name, input.location || null, input.website || null, now, id);
    
    if (result.changes === 0) {
      throw new Error(`Publisher with id ${id} not found`);
    }

    return this.findById(id)!;
  }

  delete(id: string): void {
    const db = getDatabase();
    
    // Check if publisher has books (business rule: publisher must have at least one book)
    const bookCheck = db.prepare('SELECT COUNT(*) as count FROM books WHERE publisher_id = ?');
    const bookCount = (bookCheck.get(id) as any).count;
    
    if (bookCount > 0) {
      throw new Error(`Cannot delete publisher: it has ${bookCount} book(s) associated with it`);
    }
    
    const stmt = db.prepare('DELETE FROM publishers WHERE id = ?');
    const result = stmt.run(id);
    
    if (result.changes === 0) {
      throw new Error(`Publisher with id ${id} not found`);
    }
  }

  findById(id: string): Publisher | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM publishers WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return this.mapRowToPublisher(row);
  }

  findByIdWithStats(id: string): PublisherWithStats | null {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        p.*,
        COUNT(b.id) as book_count
      FROM publishers p
      LEFT JOIN books b ON p.id = b.publisher_id
      WHERE p.id = ?
      GROUP BY p.id
    `);
    
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return this.mapRowToPublisherWithStats(row);
  }

  findAll(): PublisherWithStats[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        p.*,
        COUNT(b.id) as book_count
      FROM publishers p
      LEFT JOIN books b ON p.id = b.publisher_id
      GROUP BY p.id
      ORDER BY p.name ASC
    `);
    
    const rows = stmt.all() as any[];
    return rows.map(row => this.mapRowToPublisherWithStats(row));
  }

  findByName(name: string): Publisher | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM publishers WHERE LOWER(name) = LOWER(?)');
    const row = stmt.get(name) as any;
    
    if (!row) return null;
    
    return this.mapRowToPublisher(row);
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

  private mapRowToPublisherWithStats(row: any): PublisherWithStats {
    return {
      ...this.mapRowToPublisher(row),
      bookCount: row.book_count || 0,
    };
  }
}

export const publisherRepository = new PublisherRepository();
