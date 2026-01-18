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

### Book Search

The book search functionality provides comprehensive text search across multiple fields:

**Text Search Fields:**
- Book title
- ISBN
- Description
- Author name (via JOIN with authors table)
- Genre name (via JOIN with genres table)
- Publication year (as text)

**Filter Options:**
- Author ID (dropdown filter)
- Genre ID (dropdown filter)
- Publisher ID
- Series ID
- Category ID
- Topic ID
- Reading status (unread, reading, completed)
- Year range (yearFrom, yearTo)

**Pagination & Sorting:**
- Configurable limit and offset
- Sort by: title, year, createdAt, updatedAt
- Sort order: ascending or descending

The search uses SQL LIKE patterns with LEFT JOINs to include related entity names in the text search, allowing users to find books by typing author names, genre names, or publication years directly into the search box.

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

### Prerequisites

Before running or building the application, ensure you have the following installed on your Windows system:

| Requirement | Minimum Version | Download |
|-------------|-----------------|----------|
| **Node.js** | 18.0.0+ (LTS recommended) | [nodejs.org](https://nodejs.org/) |
| **npm** | 9.0.0+ (included with Node.js) | Included with Node.js |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |
| **Visual Studio Build Tools** | 2019+ | Required for native modules |

#### Installing Visual Studio Build Tools

The `better-sqlite3` package requires native compilation. Install the build tools:

1. Download [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. During installation, select **"Desktop development with C++"** workload
3. Ensure these components are checked:
   - MSVC v143 (or latest) - VS 2022 C++ x64/x86 build tools
   - Windows 10/11 SDK
4. Restart your terminal after installation

Alternatively, install via npm (requires admin privileges):
```bash
npm install --global windows-build-tools
```

### Getting the Source Code

```bash
git clone https://github.com/KostiaUek/ooad-final-project.git
cd ooad-final-project
```

### Installing Dependencies

```bash
npm install
```

If you encounter issues with `better-sqlite3`, try:
```bash
npm rebuild better-sqlite3
```

### Running in Development Mode

Start the application in development mode with hot-reload:

```bash
npm run dev
```

This will:
1. Start the Vite development server on `http://localhost:5173`
2. Launch the Electron application
3. Enable hot module replacement (HMR) for instant UI updates
4. Open DevTools automatically in development

**Alternative command** (runs Vite and Electron separately):
```bash
npm run electron:dev
```

### Building for Production

#### Full Build (Compile + Package)

Build the application and create Windows installers:

```bash
npm run build
```

Or specifically for Windows:
```bash
npm run electron:build:win
```

#### Build Steps Explained

1. **TypeScript Compilation**: `tsc` compiles TypeScript to JavaScript
2. **Vite Build**: Bundles the React frontend to `dist/`
3. **Electron Build**: Compiles main process code to `dist-electron/`
4. **Packaging**: `electron-builder` creates installers in `release/`

### Output Artifacts

All build outputs are located in the `release/` folder:

| File | Type | Description |
|------|------|-------------|
| `Home Library Manager Setup 1.0.0.exe` | NSIS Installer | Standard Windows installer with options |
| `Home Library Manager 1.0.0.exe` | Portable | Single executable, no installation needed |
| `win-unpacked/` | Unpacked | Extracted application files for debugging |
| `latest.yml` | Auto-update | Version info for auto-update functionality |

### Running the Built Application

#### Using the Installer
1. Navigate to `release/` folder
2. Run `Home Library Manager Setup 1.0.0.exe`
3. Follow the installation wizard
4. Launch from Start Menu or Desktop shortcut

#### Using the Portable Version
1. Navigate to `release/` folder
2. Run `Home Library Manager 1.0.0.exe` directly
3. No installation required

### Available npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with Electron |
| `npm run build` | Full production build with packaging |
| `npm run build:vite` | Build only (no packaging) |
| `npm run electron:dev` | Alternative dev mode (Vite + Electron separately) |
| `npm run electron:build` | Build and package for current platform |
| `npm run electron:build:win` | Build and package for Windows |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Run ESLint on source files |
| `npm run test` | Run tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

### Troubleshooting Build Issues

#### "Cannot find module 'better-sqlite3'"
```bash
npm rebuild better-sqlite3
```

#### "The module was compiled against a different Node.js version"
```bash
npm rebuild
# or
npx electron-rebuild
```

#### Build fails on Windows
Ensure Visual Studio Build Tools are installed with C++ workload.

#### Permission errors on Windows
Run your terminal as Administrator or use a path without special characters.

### electron-builder Configuration

```json
{
  "appId": "com.homelibrary.manager",
  "productName": "Home Library Manager",
  "directories": { "output": "release" },
  "files": [
    "dist/**/*",
    "dist-electron/**/*"
  ],
  "win": {
    "target": [
      { "target": "nsis", "arch": ["x64"] },
      { "target": "portable", "arch": ["x64"] }
    ],
    "icon": "public/icon.ico"
  },
  "nsis": {
    "oneClick": false,
    "perMachine": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true
  }
}
```
