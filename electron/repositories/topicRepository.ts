import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import type { Topic, TopicInput, TopicWithStats } from '../../src/shared/types';

export class TopicRepository {
  create(input: TopicInput): Topic {
    const db = getDatabase();
    const id = input.id || uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO topics (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, input.name, input.description || null, now, now);

    return this.findById(id)!;
  }

  update(id: string, input: TopicInput): Topic {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE topics
      SET name = ?, description = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(input.name, input.description || null, now, id);
    
    if (result.changes === 0) {
      throw new Error(`Topic with id ${id} not found`);
    }

    return this.findById(id)!;
  }

  delete(id: string): void {
    const db = getDatabase();
    
    const stmt = db.prepare('DELETE FROM topics WHERE id = ?');
    const result = stmt.run(id);
    
    if (result.changes === 0) {
      throw new Error(`Topic with id ${id} not found`);
    }
  }

  findById(id: string): Topic | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM topics WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return this.mapRowToTopic(row);
  }

  findByIdWithStats(id: string): TopicWithStats | null {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        t.*,
        COUNT(bt.book_id) as book_count
      FROM topics t
      LEFT JOIN book_topics bt ON t.id = bt.topic_id
      WHERE t.id = ?
      GROUP BY t.id
    `);
    
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return this.mapRowToTopicWithStats(row);
  }

  findAll(): TopicWithStats[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        t.*,
        COUNT(bt.book_id) as book_count
      FROM topics t
      LEFT JOIN book_topics bt ON t.id = bt.topic_id
      GROUP BY t.id
      ORDER BY t.name ASC
    `);
    
    const rows = stmt.all() as any[];
    return rows.map(row => this.mapRowToTopicWithStats(row));
  }

  findByName(name: string): Topic | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM topics WHERE LOWER(name) = LOWER(?)');
    const row = stmt.get(name) as any;
    
    if (!row) return null;
    
    return this.mapRowToTopic(row);
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

  private mapRowToTopicWithStats(row: any): TopicWithStats {
    return {
      ...this.mapRowToTopic(row),
      bookCount: row.book_count || 0,
    };
  }
}

export const topicRepository = new TopicRepository();
