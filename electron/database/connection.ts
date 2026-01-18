import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function initDatabase(): void {
  if (db) {
    return;
  }

  // Get the user data path for storing the database
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'library.db');
  
  console.log(`Database path: ${dbPath}`);

  db = new Database(dbPath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');
  
  console.log('Database initialized successfully');
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('Database closed');
  }
}

// Helper function for transactions
export function transaction<T>(fn: () => T): T {
  const database = getDatabase();
  return database.transaction(fn)();
}
