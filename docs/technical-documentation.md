# Technical Documentation

## Home Library Management System

### Table of Contents
1. [System Architecture](#system-architecture)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [IPC Communication](#ipc-communication)
5. [Business Rules](#business-rules)
6. [Security Considerations](#security-considerations)
7. [Build & Deployment](#build--deployment)

---

## System Architecture

### Overview

The Home Library Management System follows a **layered architecture** within an Electron desktop application framework. The system separates concerns between the main process (Node.js) and renderer process (React) using secure IPC communication.

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Application                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Renderer Process (React)                │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │
│  │  │   Pages  │  │Components│  │  Hooks   │          │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘          │   │
│  │       └──────────────┼──────────────┘               │   │
│  │                      ▼                              │   │
│  │              ┌──────────────┐                       │   │
│  │              │ electronAPI  │                       │   │
│  │              │  (Preload)   │                       │   │
│  │              └──────┬───────┘                       │   │
│  └──────────────────────┼───────────────────────────────┘   │
│                         │ IPC (Context Bridge)              │
│  ┌──────────────────────┼───────────────────────────────┐   │
│  │              Main Process (Node.js)                  │   │
│  │              ┌──────▼───────┐                       │   │
│  │              │ IPC Handlers │                       │   │
│  │              └──────┬───────┘                       │   │
│  │       ┌─────────────┼─────────────┐                 │   │
│  │       ▼             ▼             ▼                 │   │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐           │   │
│  │  │Services │  │Repositories│ │  Utils   │           │   │
│  │  └────┬────┘  └─────┬─────┘  └──────────┘           │   │
│  │       └─────────────┼───────────────────┘            │   │
│  │                     ▼                                │   │
│  │              ┌──────────────┐                       │   │
│  │              │    SQLite    │                       │   │
│  │              │  (Database)  │                       │   │
│  │              └──────────────┘                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Layer Descriptions

#### Renderer Process (UI Layer)
- **Pages**: React components representing full application views (Dashboard, Books, Authors, etc.)
- **Components**: Reusable UI components (Button, Modal, Input, etc.)
- **Shared Types**: TypeScript interfaces and Zod schemas for type safety

#### Preload Script (Bridge Layer)
- Exposes a secure `electronAPI` object via `contextBridge`
- All IPC calls are wrapped in type-safe functions
- No direct Node.js access from renderer

#### Main Process (Backend Layer)
- **IPC Handlers**: Process IPC requests, validate data with Zod
- **Services**: Business logic (LibraryService, ImportExportService)
- **Repositories**: Data access layer for each entity
- **Database**: SQLite with better-sqlite3

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Desktop Framework | Electron 33+ | Cross-platform desktop app |
| UI Framework | React 18 | Component-based UI |
| Language | TypeScript 5+ | Type safety |
| Build Tool | Vite 6+ | Fast bundling & HMR |
| Database | SQLite (better-sqlite3) | Local persistence |
| Validation | Zod | Runtime type validation |
| Styling | TailwindCSS 3 | Utility-first CSS |
| Packaging | electron-builder | Windows installer/portable |

### Key Dependencies

```json
{
  "dependencies": {
    "better-sqlite3": "^11.7.0",
    "uuid": "^11.1.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0",
    "vite": "^6.0.0",
    "vite-plugin-electron": "^0.28.0"
  }
}
```

---

## Database Schema

### Entity-Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   authors    │       │ book_authors │       │    books     │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │───────│ author_id(FK)│───────│ id (PK)      │
│ name         │       │ book_id (FK) │       │ title        │
│ bio          │       └──────────────┘       │ isbn         │
│ created_at   │                              │ publisher_id │──┐
│ updated_at   │       ┌──────────────┐       │ series_id    │──┼──┐
└──────────────┘       │ book_genres  │       │ category_id  │──┼──┼──┐
                       ├──────────────┤       │ ...          │  │  │  │
┌──────────────┐       │ genre_id(FK) │───────│              │  │  │  │
│   genres     │───────│ book_id (FK) │       └──────────────┘  │  │  │
├──────────────┤       └──────────────┘                         │  │  │
│ id (PK)      │                                                │  │  │
│ name (UNIQ)  │       ┌──────────────┐       ┌──────────────┐  │  │  │
│ description  │       │ book_topics  │       │  publishers  │──┘  │  │
│ created_at   │       ├──────────────┤       ├──────────────┤     │  │
│ updated_at   │       │ topic_id(FK) │       │ id (PK)      │     │  │
└──────────────┘       │ book_id (FK) │       │ name         │     │  │
                       └──────────────┘       │ location     │     │  │
┌──────────────┐                              │ website      │     │  │
│   topics     │───────────────────────┐      │ created_at   │     │  │
├──────────────┤                       │      │ updated_at   │     │  │
│ id (PK)      │                       │      └──────────────┘     │  │
│ name (UNIQ)  │       ┌──────────────┐│                           │  │
│ description  │       │series_authors││      ┌──────────────┐     │  │
│ created_at   │       ├──────────────┤│      │    series    │─────┘  │
│ updated_at   │       │ series_id(FK)│└──────├──────────────┤        │
└──────────────┘       │ author_id(FK)│       │ id (PK)      │        │
                       └──────────────┘       │ name         │        │
                                              │ description  │        │
                                              │ created_at   │        │
                                              │ updated_at   │        │
                                              └──────────────┘        │
                                                                      │
                                              ┌──────────────┐        │
                                              │  categories  │────────┘
                                              ├──────────────┤
                                              │ id (PK)      │
                                              │ name (UNIQ)  │
                                              │ description  │
                                              │ color        │
                                              │ created_at   │
                                              │ updated_at   │
                                              └──────────────┘
```

### Table Definitions

#### books
| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY (UUID v4) |
| title | TEXT | NOT NULL |
| isbn | TEXT | |
| publication_year | INTEGER | |
| pages | INTEGER | |
| description | TEXT | |
| cover_image | TEXT | |
| reading_status | TEXT | CHECK(IN 'unread','reading','completed'), DEFAULT 'unread' |
| notes | TEXT | |
| rating | REAL | CHECK(>= 0 AND <= 5) |
| publisher_id | TEXT | NOT NULL, FK → publishers ON DELETE RESTRICT |
| series_id | TEXT | FK → series ON DELETE SET NULL |
| series_order | INTEGER | |
| category_id | TEXT | NOT NULL, FK → categories ON DELETE RESTRICT |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TEXT | DEFAULT CURRENT_TIMESTAMP |

#### authors
| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY (UUID v4) |
| name | TEXT | NOT NULL |
| bio | TEXT | |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TEXT | DEFAULT CURRENT_TIMESTAMP |

#### publishers
| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY (UUID v4) |
| name | TEXT | NOT NULL |
| location | TEXT | |
| website | TEXT | |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TEXT | DEFAULT CURRENT_TIMESTAMP |

#### series
| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY (UUID v4) |
| name | TEXT | NOT NULL |
| description | TEXT | |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TEXT | DEFAULT CURRENT_TIMESTAMP |

#### genres / topics / categories
| Column | Type | Constraints |
|--------|------|-------------|
| id | TEXT | PRIMARY KEY (UUID v4) |
| name | TEXT | NOT NULL, UNIQUE |
| description | TEXT | |
| color | TEXT | (categories only) |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TEXT | DEFAULT CURRENT_TIMESTAMP |

### Junction Tables

- **book_authors**: book_id, author_id (composite PK, CASCADE on both)
- **book_genres**: book_id, genre_id (composite PK, CASCADE on both)
- **book_topics**: book_id, topic_id (composite PK, CASCADE on both)
- **series_authors**: series_id, author_id (composite PK, CASCADE on both)

### Full-Text Search

SQLite FTS5 virtual table for book search:

```sql
CREATE VIRTUAL TABLE books_fts USING fts5(
  title, 
  description, 
  notes, 
  content='books', 
  content_rowid='rowid'
);
```

Triggers automatically sync FTS index with books table (books_ai, books_ad, books_au).

---

## IPC Communication

### Channel Naming Convention

All IPC channels follow the pattern: `entity:action`

```typescript
// Examples
'books:create'
'books:search'
'authors:getAll'
'library:stats'
'export:json'
```

### Security Model

1. **Context Isolation**: Renderer has no direct Node.js access
2. **Preload Bridge**: Only whitelisted methods exposed via `contextBridge`
3. **Zod Validation**: All IPC payloads validated before processing
4. **Error Handling**: Errors caught and returned as structured responses

### API Interface

```typescript
interface ElectronAPI {
  // Books
  createBook(data: BookInput): Promise<Book>;
  updateBook(id: string, data: BookInput, options?: { cleanupOrphans?: boolean }): Promise<Book>;
  deleteBook(id: string, options?: { cleanupOrphans?: boolean }): Promise<void>;
  getBook(id: string): Promise<BookWithRelations | null>;
  getAllBooks(): Promise<BookWithRelations[]>;
  searchBooks(params: BookSearchParams): Promise<PaginatedResult<BookWithRelations>>;
  updateReadingProgress(update: ReadingProgressUpdate): Promise<Book>;
  checkBookDeleteImpact(id: string): Promise<BookDeleteImpact>;
  checkBookUpdateImpact(id: string, data: BookInput): Promise<BookDeleteImpact>;
  
  // Authors
  createAuthor(data: AuthorInput): Promise<Author>;
  updateAuthor(id: string, data: AuthorInput): Promise<Author>;
  deleteAuthor(id: string): Promise<void>;
  getAuthor(id: string): Promise<AuthorWithStats | null>;
  getAllAuthors(): Promise<AuthorWithStats[]>;
  checkAuthorDeleteImpact(id: string): Promise<AuthorDeleteImpact>;
  
  // Publishers
  createPublisher(data: PublisherInput): Promise<Publisher>;
  updatePublisher(id: string, data: PublisherInput): Promise<Publisher>;
  deletePublisher(id: string): Promise<void>;
  getPublisher(id: string): Promise<PublisherWithStats | null>;
  getAllPublishers(): Promise<PublisherWithStats[]>;
  
  // Series
  createSeries(data: SeriesInput): Promise<Series>;
  updateSeries(id: string, data: SeriesInput): Promise<Series>;
  deleteSeries(id: string): Promise<void>;
  getSeries(id: string): Promise<SeriesWithAuthors | null>;
  getAllSeries(): Promise<SeriesWithAuthors[]>;
  
  // Genres
  createGenre(data: GenreInput): Promise<Genre>;
  updateGenre(id: string, data: GenreInput): Promise<Genre>;
  deleteGenre(id: string): Promise<void>;
  getGenre(id: string): Promise<GenreWithStats | null>;
  getAllGenres(): Promise<GenreWithStats[]>;
  
  // Topics
  createTopic(data: TopicInput): Promise<Topic>;
  updateTopic(id: string, data: TopicInput): Promise<Topic>;
  deleteTopic(id: string): Promise<void>;
  getTopic(id: string): Promise<TopicWithStats | null>;
  getAllTopics(): Promise<TopicWithStats[]>;
  
  // Categories
  createCategory(data: CategoryInput): Promise<Category>;
  updateCategory(id: string, data: CategoryInput): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  getCategory(id: string): Promise<CategoryWithStats | null>;
  getAllCategories(): Promise<CategoryWithStats[]>;
  
  // Library
  getLibraryStats(): Promise<LibraryStats>;
  integrityCheck(): Promise<IntegrityCheckResult>;
  cleanupOrphans(): Promise<CleanupResult>;
  
  // Import/Export
  exportToJson(filePath: string): Promise<void>;
  exportToCsv(filePath: string): Promise<void>;
  importFromJson(filePath: string): Promise<ImportResult>;
  selectExportPath(format: 'json' | 'csv'): Promise<string | null>;
  selectImportFile(): Promise<string | null>;
}
```

---

## Business Rules

### Book Management

1. **Required Fields**: Title, at least one author, publisher, category
2. **Reading Status Values**: 'unread', 'reading', 'completed' (lowercase)
3. **Rating Range**: 0-5 (nullable, supports decimals)
4. **Default Category**: All books assigned to 'General' category if not specified
5. **ISBN Format**: No specific validation (user-entered, max 20 chars)

### Entity Relationships

1. **Book-Author**: Many-to-many (book must have ≥1 author)
2. **Book-Publisher**: Many-to-one (REQUIRED, NOT NULL)
3. **Book-Series**: Many-to-one (optional, with series order; ON DELETE SET NULL)
4. **Book-Category**: Many-to-one (REQUIRED, NOT NULL; ON DELETE RESTRICT)
5. **Book-Genre**: Many-to-many (optional)
6. **Book-Topic**: Many-to-many (optional)
7. **Series-Author**: Many-to-many (series must have ≥1 author)

### Deletion Rules

| Entity | Deletion Behavior |
|--------|-------------------|
| Book | Direct delete (CASCADE removes junction records) |
| Author | Blocked if has books; blocked if sole author of any series |
| Publisher | Blocked if has books (RESTRICT) |
| Series | Direct delete (books remain, series_id SET NULL) |
| Genre | Direct delete (junction records CASCADE) |
| Topic | Direct delete (junction records CASCADE) |
| Category | Blocked if has books (RESTRICT); 'General' category protected |

### Series Business Rules

1. **Series must have at least one book**: Series can only be created through the book form when adding/editing a book
2. **Series must have at least one author**: SeriesSchema requires `authorIds.min(1)`
3. **Author deletion blocked if sole series author**: Cannot delete an author if they are the only author of any series

### Data Integrity

- Foreign keys enforced at database level (`PRAGMA foreign_keys = ON`)
- UUIDs for all primary keys (v4 format)
- Timestamps in ISO 8601 format (created_at, updated_at)
- Proper CASCADE/SET NULL/RESTRICT on foreign key deletions
- Integrity check available via `integrityCheck()` API
- Orphan cleanup available via `cleanupOrphans()` API

---

## Security Considerations

### Electron Security

1. **Node Integration**: Disabled in renderer
2. **Context Isolation**: Enabled
3. **Remote Module**: Disabled
4. **Content Security Policy**: 
   ```
   default-src 'self'; 
   script-src 'self'; 
   style-src 'self' 'unsafe-inline'
   ```

### Data Security

- All data stored locally in SQLite
- No network requests to external servers
- File dialogs use native OS dialogs
- Import validates JSON structure before processing

---

## Build & Deployment

### Development

```bash
npm install
npm run dev
```

### Production Build

```bash
npm run build
npm run package
```

### Output Artifacts

| Type | Path | Description |
|------|------|-------------|
| NSIS Installer | `dist/Home Library Manager Setup.exe` | Standard installer |
| Portable | `dist/Home Library Manager.exe` | No installation needed |

### electron-builder Configuration

```json
{
  "appId": "com.homelibrary.manager",
  "productName": "Home Library Manager",
  "directories": { "output": "dist" },
  "files": [
    "dist-electron/**/*",
    "dist/**/*"
  ],
  "win": {
    "target": ["nsis", "portable"],
    "icon": "public/book-icon.svg"
  }
}
```
