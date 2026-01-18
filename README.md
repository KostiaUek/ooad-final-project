# Home Library Manager

A desktop application for managing personal book collections, built with Electron, React, and TypeScript.

## Features

- 📚 **Book Management**: Add, edit, and organize your book collection
- ✍️ **Author & Publisher Tracking**: Manage authors and publishers with statistics
- 📖 **Series Support**: Group books into series with reading order
- 🏷️ **Flexible Organization**: Genres, topics, and custom categories
- 📊 **Dashboard**: Overview with statistics and personalized recommendations
- 🔍 **Smart Search**: Search by title, author, genre, year, and more
- 📤 **Import/Export**: Backup and transfer your library data (JSON/CSV)

## Quick Start

### Prerequisites

- **Node.js** 18.0.0 or higher ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))
- **Visual Studio Build Tools** with C++ workload (Windows only)

### Installation

```bash
# Clone the repository
git clone https://github.com/KostiaUek/ooad-final-project.git
cd ooad-final-project

# Install dependencies
npm install
```

### Running in Development

```bash
npm run dev
```

This starts the application with hot-reload enabled for development.

### Building for Production

```bash
npm run build
```

Build outputs are created in the `release/` folder:
- `Home Library Manager Setup 1.0.0.exe` - Windows installer
- `Home Library Manager 1.0.0.exe` - Portable version (no installation required)

## Documentation

- [User Manual](docs/user-manual.md) - Complete guide for using the application
- [Technical Documentation](docs/technical-documentation.md) - Architecture, database schema, and API reference
- [UML Diagrams](docs/uml/) - System design diagrams

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Electron | Desktop application framework |
| React 18 | UI components |
| TypeScript | Type-safe development |
| Vite | Build tool with HMR |
| SQLite | Local database (better-sqlite3) |
| TailwindCSS | Styling |
| Zod | Runtime validation |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build and package for production |
| `npm run test` | Run tests |
| `npm run lint` | Lint source files |
| `npm run typecheck` | TypeScript type checking |

## License

MIT