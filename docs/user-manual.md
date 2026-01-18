# User Manual

## Home Library Management System

Welcome to the Home Library Management System! This application helps you organize and track your personal book collection.

---

## Table of Contents

1. [Installation](#installation)
2. [Getting Started](#getting-started)
3. [Dashboard](#dashboard)
4. [Managing Books](#managing-books)
5. [Managing Authors](#managing-authors)
6. [Managing Publishers](#managing-publishers)
7. [Managing Series](#managing-series)
8. [Managing Genres](#managing-genres)
9. [Managing Topics](#managing-topics)
10. [Managing Categories](#managing-categories)
11. [Import & Export](#import--export)
12. [Tips & Tricks](#tips--tricks)

---

## Installation

### Windows Installation

#### Option 1: Installer (Recommended)
1. Navigate to the `release/` folder
2. Double-click `Home Library Manager Setup 1.0.0.exe`
3. Follow the installation wizard:
   - Choose installation directory (or use default)
   - Select whether to create Desktop/Start Menu shortcuts
4. Click "Install" and wait for completion
5. Launch from Start Menu or Desktop shortcut

#### Option 2: Portable Version
1. Navigate to the `release/` folder
2. Copy `Home Library Manager 1.0.0.exe` to any folder
3. Double-click to run (no installation required)
4. Your data will be stored in `%APPDATA%\home-library-manager\`

### Running from Source (Development)

If you want to run the application from source code:

1. **Prerequisites**:
   - Node.js 18+ ([nodejs.org](https://nodejs.org/))
   - Git ([git-scm.com](https://git-scm.com/))
   - Visual Studio Build Tools with C++ workload

2. **Clone and install**:
   ```bash
   git clone https://github.com/KostiaUek/ooad-final-project.git
   cd ooad-final-project
   npm install
   ```

3. **Run in development mode**:
   ```bash
   npm run dev
   ```

4. **Build your own installer** (optional):
   ```bash
   npm run build
   ```
   Installers will be created in the `release/` folder.

### First Launch

When you first open the application, it will:
- Create a local database to store your library
- Set up default categories and genres
- Display an empty dashboard ready for you to add books

---

## Getting Started

### Application Layout

The application has a sidebar on the left with navigation to all sections:

| Icon | Section | Description |
|------|---------|-------------|
| 📊 | Dashboard | Overview and statistics |
| 📚 | Books | Your book collection |
| ✍️ | Authors | Manage authors |
| 🏢 | Publishers | Manage publishers |
| 📖 | Series | Manage book series |
| 🏷️ | Genres | Manage genres |
| 💡 | Topics | Manage topics |
| 📁 | Categories | Custom shelves |
| 📤 | Import/Export | Backup and transfer data |

### Quick Start

1. **Add your first book**: Click "Books" → "Add Book"
2. **Enter book details**: Title, author(s), and other information
3. **Set reading status**: Track what you're reading
4. **Organize**: Add genres, topics, and categories

---

## Dashboard

The Dashboard provides an overview of your library:

### Statistics Cards
- **Total Books**: Your complete collection count
- **Authors**: Number of unique authors
- **Publishers**: Number of publishers
- **Series**: Number of book series

### Reading Status Breakdown
- 📖 **Unread**: Books you haven't started
- 📗 **Reading**: Books currently in progress
- ✅ **Completed**: Books you've finished

### Top Genres
See which genres are most represented in your library.

### Top Authors
See which authors you have the most books from.

### Recommended Books
Get personalized book suggestions based on your reading history:

- **If you have completed books**: The system recommends unread books from your top 3 most-read genres (based on completed books)
- **If you haven't completed any books yet**: The system shows your 5 most recently added unread books

**Tip**: Complete and rate your books to get better personalized recommendations!

---

## Managing Books

### Viewing Books

The Books page shows your collection in a grid layout. Each book card displays:
- Cover image (if available)
- Title and author(s)
- Publisher
- Reading status badge
- Rating stars

### Searching Books

Use the search bar to find books by:
- Title
- Author name
- Genre name
- Publication year
- ISBN
- Description

### Filtering Books

Use the dropdown filters and input fields to narrow results:
- **Status**: Filter by reading status (Unread, Reading, Completed)
- **Genre**: Filter by a specific genre
- **Author**: Filter by a specific author
- **Year**: Filter by publication year

You can combine multiple filters together, and use the "Clear all" button to reset all filters at once.

### Adding a Book

1. Click **"Add Book"** button
2. Fill in the form:
   - **Title** (required)
   - **Author(s)** (required) - select existing or create new
   - **Publisher** (required) - select existing or create new
   - **Category** (required) - for organization
   - **Series** - if book is part of a series (optional)
   - **Genres & Topics** - for classification (optional)
   - **Other details** - ISBN, year, pages, rating, etc. (optional)
3. Click **"Save"**

### Editing a Book

1. Click on a book card to view details
2. Click **"Edit"** button
3. Modify the information
4. Click **"Save Changes"**

### Deleting a Book

1. Click on a book card to view details
2. Click **"Delete"** button
3. Confirm the deletion

### Reading Status

Track your reading progress:

| Status | Description |
|--------|-------------|
| unread | Not yet started |
| reading | Currently reading |
| completed | Finished reading |

To update status:
1. Open book details
2. Click "Edit"
3. Change the Reading Status
4. Click "Save"

---

## Managing Authors

### Viewing Authors

The Authors page displays all authors with their book counts.

### Adding an Author

1. Click **"Add Author"**
2. Enter author information:
   - **Name** (required)
   - Bio (optional)
3. Click **"Add Author"**

### Editing an Author

1. Click **"Edit"** on the author card
2. Modify information
3. Click **"Save Changes"**

### Deleting an Author

Authors can only be deleted if:
- They have no books associated with them
- They are not the sole author of any series

Remove the author from all books and ensure each series has other authors first.

---

## Managing Publishers

### Adding a Publisher

1. Click **"Add Publisher"**
2. Enter publisher information:
   - **Name** (required)
   - Location (optional)
   - Website (optional)
3. Click **"Add Publisher"**

### Deleting a Publisher

Publishers can only be deleted if they have no books.

---

## Managing Series

### What is a Series?

A series groups related books together (e.g., "Harry Potter", "The Lord of the Rings").

### Creating a Series

Series can **only be created through the Book form** when adding or editing a book. This ensures every series has at least one book.

1. When adding or editing a book, scroll to the Series section
2. Click **"Create New Series"** or use the series dropdown
3. Enter series information:
   - **Name** (required)
   - Description (optional)
   - **Author(s)** (required) - who writes the series
4. The series will be created when you save the book

### Adding Books to a Series

When adding or editing a book:
1. Select the series from the dropdown
2. Enter the **Series Order** (book number in series)

---

## Managing Genres

### What are Genres?

Genres categorize books by their type or style (e.g., "Fiction", "Mystery", "Science Fiction").

### Adding a Genre

1. Click **"Add Genre"**
2. Enter genre name and description
3. Click **"Add Genre"**

### Assigning Genres to Books

When adding or editing a book, select one or more genres from the multi-select dropdown.

---

## Managing Topics

### What are Topics?

Topics are specific subjects covered in books (e.g., "Machine Learning", "World War II", "Cooking").

### Adding a Topic

1. Click **"Add Topic"**
2. Enter topic name and description
3. Click **"Add Topic"**

---

## Managing Categories

### What are Categories?

Categories are like custom shelves to organize your books (e.g., "To Read This Year", "Favorites", "Lent Out").

### Default Category

All books are assigned to "General" by default.

### Creating a Category

1. Click **"Add Category"**
2. Enter:
   - **Name** (required)
   - Description
   - **Color** - pick a color for visual identification
3. Click **"Add Category"**

### Assigning Categories

When adding or editing a book, select a category from the dropdown.

---

## Import & Export

### Exporting Your Library

#### JSON Export (Full Backup)

1. Go to **Import/Export** page
2. Click **"Export as JSON"**
3. Choose where to save the file
4. Your complete library is saved

Use JSON export for:
- Full backups
- Transferring to another computer
- Creating restore points

#### CSV Export (Books Only)

1. Click **"Export Books as CSV"**
2. Choose where to save the file
3. Your books are exported as a spreadsheet

Use CSV export for:
- Viewing in Excel or Google Sheets
- Sharing book lists
- Analysis and reporting

### Importing Data

1. Go to **Import/Export** page
2. Click **"Import from JSON"**
3. Select a previously exported JSON file
4. Review the import summary

**Note**: Importing doesn't duplicate existing items (matched by ID).

---

## Tips & Tricks

### Keyboard Shortcuts

- **Escape**: Close modals
- **Enter**: Submit forms (when focused)

### Organization Tips

1. **Use Categories as Shelves**: Create categories like "To Read", "Favorites", "Reference"
2. **Leverage Topics**: Use topics for specific subjects you're interested in
3. **Track Reading Progress**: Update status when you start/finish books
4. **Rate Your Books**: Help identify favorites for recommendations

### Backup Best Practices

1. **Regular Exports**: Export your library weekly or monthly
2. **Multiple Locations**: Save exports to cloud storage (Google Drive, OneDrive)
3. **Version Your Backups**: Include dates in export filenames

### Performance Tips

- The app performs best with libraries under 10,000 books
- Use search and filters to find specific books quickly
- Close the app properly to ensure data is saved

---

## Troubleshooting

### Common Issues

#### "Cannot delete author/publisher"
The entity has books associated with it. Remove it from all books first.

#### "Cannot delete category"
Only non-default categories with no books can be deleted.

#### Books not appearing in search
The search box searches across title, author name, genre name, publication year, ISBN, and description. Make sure you're using relevant keywords. You can also use the dropdown filters for precise filtering by status, genre, author, or year.

### Getting Help

If you encounter issues:
1. Check this manual for guidance
2. Try restarting the application
3. Export your data as a backup before troubleshooting

---

## Data Location

Your library data is stored locally on your computer:

**Windows**: `%APPDATA%\home-library-manager\library.db`

This SQLite database contains all your books, authors, and other data.

---

Thank you for using the Home Library Management System! Happy reading! 📚
