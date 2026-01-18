import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import type { Category, CategoryInput, CategoryWithStats } from '../../src/shared/types';

export class CategoryRepository {
  create(input: CategoryInput): Category {
    const db = getDatabase();
    const id = input.id || uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO categories (id, name, description, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, input.name, input.description || null, input.color || '#3b82f6', now, now);

    return this.findById(id)!;
  }

  update(id: string, input: CategoryInput): Category {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE categories
      SET name = ?, description = ?, color = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(input.name, input.description || null, input.color || '#3b82f6', now, id);
    
    if (result.changes === 0) {
      throw new Error(`Category with id ${id} not found`);
    }

    return this.findById(id)!;
  }

  delete(id: string): void {
    const db = getDatabase();
    
    // Check if category has books
    const bookCheck = db.prepare('SELECT COUNT(*) as count FROM books WHERE category_id = ?');
    const bookCount = (bookCheck.get(id) as any).count;
    
    if (bookCount > 0) {
      throw new Error(`Cannot delete category: it has ${bookCount} book(s) associated with it`);
    }
    
    // Prevent deletion of default category
    if (id === 'default-category') {
      throw new Error('Cannot delete the default category');
    }
    
    const stmt = db.prepare('DELETE FROM categories WHERE id = ?');
    const result = stmt.run(id);
    
    if (result.changes === 0) {
      throw new Error(`Category with id ${id} not found`);
    }
  }

  findById(id: string): Category | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM categories WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return this.mapRowToCategory(row);
  }

  findByIdWithStats(id: string): CategoryWithStats | null {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        c.*,
        COUNT(b.id) as book_count
      FROM categories c
      LEFT JOIN books b ON c.id = b.category_id
      WHERE c.id = ?
      GROUP BY c.id
    `);
    
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return this.mapRowToCategoryWithStats(row);
  }

  findAll(): CategoryWithStats[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        c.*,
        COUNT(b.id) as book_count
      FROM categories c
      LEFT JOIN books b ON c.id = b.category_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    
    const rows = stmt.all() as any[];
    return rows.map(row => this.mapRowToCategoryWithStats(row));
  }

  findByName(name: string): Category | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM categories WHERE LOWER(name) = LOWER(?)');
    const row = stmt.get(name) as any;
    
    if (!row) return null;
    
    return this.mapRowToCategory(row);
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

  private mapRowToCategoryWithStats(row: any): CategoryWithStats {
    return {
      ...this.mapRowToCategory(row),
      bookCount: row.book_count || 0,
    };
  }
}

export const categoryRepository = new CategoryRepository();
