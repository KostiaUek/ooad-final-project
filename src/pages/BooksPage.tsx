import { useEffect, useState } from 'react';
import type {
  BookWithRelations,
  BookSearchParams,
  AuthorWithStats,
  PublisherWithStats,
  SeriesWithAuthors,
  GenreWithStats,
  TopicWithStats,
  CategoryWithStats,
  ReadingStatusType,
} from '../shared/types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingPage } from '../components/ui/LoadingSpinner';
import { StatusBadge } from '../components/ui/StatusBadge';
import { BookFormModal } from '../components/books/BookFormModal';
import { BookDetailsModal } from '../components/books/BookDetailsModal';

export function BooksPage() {
  const [books, setBooks] = useState<BookWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [genreFilter, setGenreFilter] = useState<string>('');
  const [authorFilter, setAuthorFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');
  
  // Related data for filters
  const [genres, setGenres] = useState<GenreWithStats[]>([]);
  const [authors, setAuthors] = useState<AuthorWithStats[]>([]);
  const [publishers, setPublishers] = useState<PublisherWithStats[]>([]);
  const [series, setSeries] = useState<SeriesWithAuthors[]>([]);
  const [topics, setTopics] = useState<TopicWithStats[]>([]);
  const [categories, setCategories] = useState<CategoryWithStats[]>([]);
  
  // Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookWithRelations | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    searchBooks();
  }, [searchQuery, statusFilter, genreFilter, authorFilter, yearFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [booksData, genresData, authorsData, publishersData, seriesData, topicsData, categoriesData] = await Promise.all([
        window.electronAPI.getAllBooks(),
        window.electronAPI.getAllGenres(),
        window.electronAPI.getAllAuthors(),
        window.electronAPI.getAllPublishers(),
        window.electronAPI.getAllSeries(),
        window.electronAPI.getAllTopics(),
        window.electronAPI.getAllCategories(),
      ]);
      setBooks(booksData);
      setGenres(genresData);
      setAuthors(authorsData);
      setPublishers(publishersData);
      setSeries(seriesData);
      setTopics(topicsData);
      setCategories(categoriesData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const searchBooks = async () => {
    try {
      const params: BookSearchParams = {};
      if (searchQuery) params.query = searchQuery;
      if (statusFilter) params.readingStatus = statusFilter as ReadingStatusType;
      if (genreFilter) params.genreId = genreFilter;
      if (authorFilter) params.authorId = authorFilter;
      if (yearFilter) {
        const year = parseInt(yearFilter, 10);
        if (!isNaN(year)) {
          params.yearFrom = year;
          params.yearTo = year;
        }
      }
      
      const result = await window.electronAPI.searchBooks(params);
      setBooks(result.items);
    } catch (err: any) {
      console.error('Search error:', err);
    }
  };

  const handleAddBook = () => {
    setSelectedBook(null);
    setIsFormModalOpen(true);
  };

  const handleEditBook = (book: BookWithRelations) => {
    setSelectedBook(book);
    setIsFormModalOpen(true);
  };

  const handleViewBook = (book: BookWithRelations) => {
    setSelectedBook(book);
    setIsDetailsModalOpen(true);
  };

  const handleDeleteBook = async (book: BookWithRelations) => {
    try {
      // Check if deletion would orphan any entities
      const impact = await window.electronAPI.checkBookDeleteImpact(book.id);
      
      if (impact.hasImpact) {
        const orphanedItems: string[] = [];
        if (impact.orphanedAuthors.length > 0) {
          orphanedItems.push(`Authors: ${impact.orphanedAuthors.map(a => a.name).join(', ')}`);
        }
        if (impact.orphanedPublisher) {
          orphanedItems.push(`Publisher: ${impact.orphanedPublisher.name}`);
        }
        if (impact.orphanedSeries) {
          orphanedItems.push(`Series: ${impact.orphanedSeries.name}`);
        }
        
        const confirmMessage = 
          `Deleting "${book.title}" would leave the following entities without any books:\n\n` +
          `• ${orphanedItems.join('\n• ')}\n\n` +
          `What would you like to do?\n\n` +
          `Click OK to delete the book AND these orphaned entities.\n` +
          `Click Cancel to abort and reassign them manually first.`;
        
        if (!confirm(confirmMessage)) {
          return;
        }
        
        // Delete with cleanup
        await window.electronAPI.deleteBook(book.id, { cleanupOrphans: true });
      } else {
        if (!confirm(`Are you sure you want to delete "${book.title}"?`)) {
          return;
        }
        await window.electronAPI.deleteBook(book.id);
      }
      
      await loadData();
    } catch (err: any) {
      alert(`Failed to delete book: ${err.message}`);
    }
  };

  const handleFormSubmit = async () => {
    setIsFormModalOpen(false);
    setSelectedBook(null);
    await loadData();
  };

  const handleUpdateProgress = async (bookId: string, status: ReadingStatusType, notes?: string) => {
    try {
      await window.electronAPI.updateReadingProgress({ bookId, readingStatus: status, notes });
      await loadData();
      // Update selectedBook to reflect the changes in the modal
      if (selectedBook && selectedBook.id === bookId) {
        setSelectedBook({
          ...selectedBook,
          readingStatus: status,
          notes: notes || selectedBook.notes,
        });
      }
    } catch (err: any) {
      alert(`Failed to update progress: ${err.message}`);
    }
  };

  if (loading) {
    return <LoadingPage />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading books: {error}</p>
        <Button onClick={loadData} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Books</h1>
          <p className="text-gray-500 mt-1">{books.length} books in your library</p>
        </div>
        <Button onClick={handleAddBook}>
          + Add Book
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input
            placeholder="Search by title, author, genre, year..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select
            placeholder="All Statuses"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'unread', label: 'Unread' },
              { value: 'reading', label: 'Reading' },
              { value: 'completed', label: 'Completed' },
            ]}
          />
          <Select
            placeholder="All Genres"
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            options={genres.map((g) => ({ value: g.id, label: g.name }))}
          />
          <Select
            placeholder="All Authors"
            value={authorFilter}
            onChange={(e) => setAuthorFilter(e.target.value)}
            options={authors.map((a) => ({ value: a.id, label: a.name }))}
          />
          <Input
            type="number"
            placeholder="Filter by year"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          />
        </div>
        {(searchQuery || statusFilter || genreFilter || authorFilter || yearFilter) && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-gray-500">Filters active:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
                setGenreFilter('');
                setAuthorFilter('');
                setYearFilter('');
              }}
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Books List */}
      {books.length === 0 ? (
        <EmptyState
          icon="📚"
          title="No books found"
          description={searchQuery || statusFilter || genreFilter || authorFilter || yearFilter
            ? "No books match your search criteria. Try adjusting your filters."
            : "Start building your library by adding your first book!"}
          action={!searchQuery && !statusFilter && !genreFilter && !authorFilter && !yearFilter ? {
            label: 'Add Your First Book',
            onClick: handleAddBook,
          } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {books.map((book) => (
            <div key={book.id} className="card hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{book.title}</h3>
                  <p className="text-sm text-gray-500 truncate">
                    {book.authors.length > 0
                      ? book.authors.map((a) => a.name).join(', ')
                      : 'Unknown Author'}
                  </p>
                </div>
                <StatusBadge status={book.readingStatus} size="sm" />
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                {book.publisher && (
                  <p><span className="text-gray-400">Publisher:</span> {book.publisher.name}</p>
                )}
                {book.publicationYear && (
                  <p><span className="text-gray-400">Year:</span> {book.publicationYear}</p>
                )}
                {book.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {book.genres.slice(0, 3).map((g) => (
                      <span key={g.id} className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                        {g.name}
                      </span>
                    ))}
                    {book.genres.length > 3 && (
                      <span className="text-xs text-gray-400">+{book.genres.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <Button variant="ghost" size="sm" onClick={() => handleViewBook(book)}>
                  View
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleEditBook(book)}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDeleteBook(book)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Book Form Modal */}
      <BookFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedBook(null);
        }}
        book={selectedBook}
        onSubmit={handleFormSubmit}
        authors={authors}
        publishers={publishers}
        series={series}
        genres={genres}
        topics={topics}
        categories={categories}
      />

      {/* Book Details Modal */}
      <BookDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedBook(null);
        }}
        book={selectedBook}
        onUpdateProgress={handleUpdateProgress}
        onEdit={handleEditBook}
      />
    </div>
  );
}
