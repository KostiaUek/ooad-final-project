import { useEffect, useState } from 'react';
import type { CategoryWithStats, CategoryInput, BookWithRelations } from '../shared/types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingPage, LoadingSpinner } from '../components/ui/LoadingSpinner';
import { StatusBadge } from '../components/ui/StatusBadge';
import { BookDetailsModal } from '../components/books/BookDetailsModal';

export function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<CategoryInput>({ name: '', description: '', color: '#3b82f6' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Books modal state
  const [isBooksModalOpen, setIsBooksModalOpen] = useState(false);
  const [booksModalCategory, setBooksModalCategory] = useState<CategoryWithStats | null>(null);
  const [categoryBooks, setCategoryBooks] = useState<BookWithRelations[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [selectedBookForDetails, setSelectedBookForDetails] = useState<BookWithRelations | null>(null);
  const [isBookDetailsOpen, setIsBookDetailsOpen] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await window.electronAPI.getAllCategories();
      setCategories(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedCategory(null);
    setFormData({ name: '', description: '', color: '#3b82f6' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = (category: CategoryWithStats) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || '#3b82f6',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = async (category: CategoryWithStats) => {
    if (category.id === 'default-category') {
      alert('Cannot delete the default category');
      return;
    }
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) return;
    try {
      await window.electronAPI.deleteCategory(category.id);
      await loadCategories();
    } catch (err: any) {
      alert(`Failed to delete category: ${err.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setFormErrors({ name: 'Name is required' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedCategory) {
        await window.electronAPI.updateCategory(selectedCategory.id, formData);
      } else {
        await window.electronAPI.createCategory(formData);
      }
      setIsModalOpen(false);
      await loadCategories();
    } catch (err: any) {
      setFormErrors({ submit: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewBooks = async (category: CategoryWithStats) => {
    setBooksModalCategory(category);
    setIsBooksModalOpen(true);
    setLoadingBooks(true);
    try {
      const result = await window.electronAPI.searchBooks({ categoryId: category.id });
      setCategoryBooks(result.items);
    } catch (err: any) {
      console.error('Failed to load books:', err);
      setCategoryBooks([]);
    } finally {
      setLoadingBooks(false);
    }
  };

  const handleBookClick = (book: BookWithRelations) => {
    setSelectedBookForDetails(book);
    setIsBookDetailsOpen(true);
  };

  const filteredCategories = categories.filter(
    (c) => c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <LoadingPage />;

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error: {error}</p>
        <Button onClick={loadCategories} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-500 mt-1">{categories.length} categories (custom shelves)</p>
        </div>
        <Button onClick={handleAdd}>+ Add Category</Button>
      </div>

      <div className="card">
        <Input
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredCategories.length === 0 ? (
        <EmptyState
          icon="📁"
          title="No categories found"
          description={searchQuery ? "No categories match your search." : "Create custom categories to organize your books into shelves."}
          action={!searchQuery ? { label: 'Add Category', onClick: handleAdd } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((category) => (
            <div key={category.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: category.color || '#3b82f6' }}
                >
                  📁
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{category.name}</h3>
                  <p className="text-sm text-gray-500">{category.bookCount} books</p>
                </div>
              </div>
              {category.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-4">{category.description}</p>
              )}
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <Button variant="ghost" size="sm" onClick={() => handleViewBooks(category)}>View Books</Button>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(category)}>Edit</Button>
                {category.id !== 'default-category' && (
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(category)}>Delete</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedCategory ? 'Edit Category' : 'Add Category'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {formErrors.submit}
            </div>
          )}
          <Input
            label="Name *"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            error={formErrors.name}
            placeholder="Enter category name"
          />
          <Textarea
            label="Description"
            value={formData.description || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Enter category description..."
            rows={3}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.color || '#3b82f6'}
                onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                className="w-10 h-10 rounded cursor-pointer"
              />
              <span className="text-sm text-gray-500">{formData.color}</span>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {selectedCategory ? 'Save Changes' : 'Add Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Books by Category Modal */}
      <Modal
        isOpen={isBooksModalOpen}
        onClose={() => setIsBooksModalOpen(false)}
        title={booksModalCategory ? `Books in "${booksModalCategory.name}"` : 'Books'}
        size="lg"
      >
        {loadingBooks ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : categoryBooks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <span className="text-4xl mb-2 block">📚</span>
            <p>No books in this category yet.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {categoryBooks.map((book) => (
              <div
                key={book.id}
                className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                onClick={() => handleBookClick(book)}
              >
                {book.coverImage ? (
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    className="w-12 h-16 object-cover rounded shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-400">
                    📖
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">{book.title}</h4>
                  <p className="text-sm text-gray-500 truncate">
                    {book.authors.map((a) => a.name).join(', ') || 'Unknown author'}
                  </p>
                  {book.publisher && (
                    <p className="text-xs text-gray-400">{book.publisher.name}</p>
                  )}
                </div>
                <StatusBadge status={book.readingStatus} />
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end pt-4 mt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={() => setIsBooksModalOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>

      {/* Book Details Modal */}
      <BookDetailsModal
        book={selectedBookForDetails}
        isOpen={isBookDetailsOpen}
        onClose={() => {
          setIsBookDetailsOpen(false);
          setSelectedBookForDetails(null);
        }}
        onEdit={() => {
          // Close details and let user go to Books page to edit
          setIsBookDetailsOpen(false);
        }}
        onUpdateProgress={async (bookId, status, notes) => {
          try {
            await window.electronAPI.updateReadingProgress({ bookId, readingStatus: status, notes });
            // Refresh the books list after update
            if (booksModalCategory) {
              const result = await window.electronAPI.searchBooks({ categoryId: booksModalCategory.id });
              setCategoryBooks(result.items);
              // Update the selected book details
              const updatedBook = result.items.find(b => b.id === bookId);
              if (updatedBook) {
                setSelectedBookForDetails(updatedBook);
              }
            }
          } catch (err: any) {
            console.error('Failed to update progress:', err);
          }
        }}
      />
    </div>
  );
}
