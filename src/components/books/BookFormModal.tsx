import { useState, useEffect } from 'react';
import type {
  BookWithRelations,
  BookInput,
  AuthorWithStats,
  PublisherWithStats,
  SeriesWithAuthors,
  GenreWithStats,
  TopicWithStats,
  CategoryWithStats,
  ReadingStatusType,
} from '../../shared/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { MultiSelect } from '../ui/MultiSelect';

interface BookFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: BookWithRelations | null;
  onSubmit: () => void;
  authors: AuthorWithStats[];
  publishers: PublisherWithStats[];
  series: SeriesWithAuthors[];
  genres: GenreWithStats[];
  topics: TopicWithStats[];
  categories: CategoryWithStats[];
}

export function BookFormModal({
  isOpen,
  onClose,
  book,
  onSubmit,
  authors,
  publishers,
  series,
  genres,
  topics,
  categories,
}: BookFormModalProps) {
  const [formData, setFormData] = useState<BookInput>({
    title: '',
    isbn: '',
    publicationYear: undefined,
    pages: undefined,
    description: '',
    readingStatus: 'unread',
    notes: '',
    rating: undefined,
    publisherId: '',
    seriesId: undefined,
    seriesOrder: undefined,
    categoryId: '',
    authorIds: [],
    genreIds: [],
    topicIds: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New entity creation - stored locally until book is saved
  const [showNewAuthor, setShowNewAuthor] = useState(false);
  const [newAuthorName, setNewAuthorName] = useState('');
  const [pendingAuthors, setPendingAuthors] = useState<string[]>([]); // Names of authors to create with book
  const [showNewPublisher, setShowNewPublisher] = useState(false);
  const [newPublisherName, setNewPublisherName] = useState('');
  const [pendingPublisher, setPendingPublisher] = useState<string | null>(null); // Name of publisher to create with book
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [pendingCategory, setPendingCategory] = useState<{ name: string; color: string } | null>(null); // Category to create with book
  const [showNewSeries, setShowNewSeries] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState('');
  const [pendingSeries, setPendingSeries] = useState<{ name: string; description: string } | null>(null); // Series to create with book

  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title,
        isbn: book.isbn || '',
        publicationYear: book.publicationYear,
        pages: book.pages,
        description: book.description || '',
        readingStatus: book.readingStatus,
        notes: book.notes || '',
        rating: book.rating,
        publisherId: book.publisherId,
        seriesId: book.seriesId,
        seriesOrder: book.seriesOrder,
        categoryId: book.categoryId,
        authorIds: book.authors.map((a) => a.id),
        genreIds: book.genres.map((g) => g.id),
        topicIds: book.topics.map((t) => t.id),
      });
    } else {
      setFormData({
        title: '',
        isbn: '',
        publicationYear: undefined,
        pages: undefined,
        description: '',
        readingStatus: 'unread',
        notes: '',
        rating: undefined,
        publisherId: '',
        seriesId: undefined,
        seriesOrder: undefined,
        categoryId: categories.find(c => c.name === 'General')?.id || categories[0]?.id || '',
        authorIds: [],
        genreIds: [],
        topicIds: [],
      });
    }
    setErrors({});
    setPendingAuthors([]);
    setPendingPublisher(null);
    setPendingCategory(null);
    setPendingSeries(null);
    setShowNewCategory(false);
    setShowNewSeries(false);
  }, [book, isOpen, categories]);

  // Helper to check if a string is a valid UUID
  const isValidUuid = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    // Publisher is required - either selected from dropdown OR pending creation
    if (!formData.publisherId && !pendingPublisher) {
      newErrors.publisherId = 'Publisher is required';
    } else if (formData.publisherId && !isValidUuid(formData.publisherId) && !pendingPublisher) {
      newErrors.publisherId = 'Please select a valid publisher';
    }
    if (!formData.categoryId || !isValidUuid(formData.categoryId)) {
      // Category is required - either selected from dropdown OR pending creation
      if (!pendingCategory) {
        newErrors.categoryId = 'Category is required';
      }
    }
    if (formData.publicationYear && (formData.publicationYear < 1000 || formData.publicationYear > new Date().getFullYear() + 1)) {
      newErrors.publicationYear = 'Invalid publication year';
    }
    if (formData.pages && formData.pages < 1) {
      newErrors.pages = 'Pages must be a positive number';
    }
    if (formData.rating !== undefined && (formData.rating < 0 || formData.rating > 5)) {
      newErrors.rating = 'Rating must be between 0 and 5';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // Build the final form data with any pending entities
      let finalFormData = { ...formData };
      
      // Create pending authors first and add their IDs
      const createdAuthorIds: string[] = [];
      for (const authorName of pendingAuthors) {
        const author = await window.electronAPI.createAuthor({ name: authorName });
        createdAuthorIds.push(author.id);
      }
      if (createdAuthorIds.length > 0) {
        finalFormData = {
          ...finalFormData,
          authorIds: [...(finalFormData.authorIds || []), ...createdAuthorIds],
        };
      }
      
      // Create pending publisher first and set the ID
      if (pendingPublisher) {
        const publisher = await window.electronAPI.createPublisher({ name: pendingPublisher });
        finalFormData = {
          ...finalFormData,
          publisherId: publisher.id,
        };
      }

      // Create pending category first and set the ID
      if (pendingCategory) {
        const category = await window.electronAPI.createCategory({ 
          name: pendingCategory.name, 
          color: pendingCategory.color 
        });
        finalFormData = {
          ...finalFormData,
          categoryId: category.id,
        };
      }

      // Create pending series and set the ID
      // Series is created with the book's authors to satisfy the "series must have at least 1 author" rule
      if (pendingSeries) {
        // Collect all author IDs (existing + pending ones that were just created)
        const seriesAuthorIds = [...(finalFormData.authorIds || [])];
        if (seriesAuthorIds.length === 0) {
          setErrors({ submit: 'A series requires at least one author. Please add authors to the book.' });
          setIsSubmitting(false);
          return;
        }
        const newSeries = await window.electronAPI.createSeries({ 
          name: pendingSeries.name, 
          description: pendingSeries.description || undefined,
          authorIds: seriesAuthorIds,
        });
        finalFormData = {
          ...finalFormData,
          seriesId: newSeries.id,
          seriesOrder: finalFormData.seriesOrder || 1, // Default to first in series
        };
      }

      // Sanitize data before submission - convert empty strings to undefined and filter invalid UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const sanitizedData = {
        ...finalFormData,
        isbn: finalFormData.isbn || undefined,
        description: finalFormData.description || undefined,
        notes: finalFormData.notes || undefined,
        seriesId: finalFormData.seriesId || undefined,
        // Filter arrays to only include valid UUIDs
        authorIds: (finalFormData.authorIds || []).filter(id => uuidRegex.test(id)),
        genreIds: (finalFormData.genreIds || []).filter(id => uuidRegex.test(id)),
        topicIds: (finalFormData.topicIds || []).filter(id => uuidRegex.test(id)),
      };
      
      if (book) {
        // Check if updating would orphan any entities
        const impact = await window.electronAPI.checkBookUpdateImpact(book.id, sanitizedData);
        
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
            `This update would leave the following entities without any books:\n\n` +
            `• ${orphanedItems.join('\n• ')}\n\n` +
            `Click OK to delete these orphaned entities and save changes.\n` +
            `Click Cancel to discard your edits.`;
          
          const shouldProceed = window.confirm(confirmMessage);
          if (!shouldProceed) {
            setIsSubmitting(false);
            return; // Abort the edit
          }
          await window.electronAPI.updateBook(book.id, sanitizedData, { cleanupOrphans: true });
        } else {
          await window.electronAPI.updateBook(book.id, sanitizedData);
        }
      } else {
        await window.electronAPI.createBook(sanitizedData);
      }
      onSubmit();
    } catch (err: any) {
      setErrors({ submit: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPendingAuthor = () => {
    if (!newAuthorName.trim()) return;
    // Check for duplicates in pending authors
    if (pendingAuthors.includes(newAuthorName.trim())) {
      alert('This author is already pending creation');
      return;
    }
    // Check for duplicates in existing authors
    if (authors.some(a => a.name.toLowerCase() === newAuthorName.trim().toLowerCase())) {
      alert('An author with this name already exists. Please select from the dropdown.');
      return;
    }
    setPendingAuthors((prev) => [...prev, newAuthorName.trim()]);
    setNewAuthorName('');
    setShowNewAuthor(false);
  };

  const handleSetPendingPublisher = () => {
    if (!newPublisherName.trim()) return;
    // Check for duplicates in existing publishers
    if (publishers.some(p => p.name.toLowerCase() === newPublisherName.trim().toLowerCase())) {
      alert('A publisher with this name already exists. Please select from the dropdown.');
      return;
    }
    setPendingPublisher(newPublisherName.trim());
    // Clear the selected publisher ID since we're using a pending one
    setFormData((prev) => ({ ...prev, publisherId: '' }));
    setNewPublisherName('');
    setShowNewPublisher(false);
  };

  const handleSetPendingCategory = () => {
    if (!newCategoryName.trim()) return;
    // Check for duplicates in existing categories
    if (categories.some(c => c.name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      alert('A category with this name already exists. Please select from the dropdown.');
      return;
    }
    setPendingCategory({ name: newCategoryName.trim(), color: '#3b82f6' }); // Default blue color
    // Clear the selected category ID since we're using a pending one
    setFormData((prev) => ({ ...prev, categoryId: '' }));
    setNewCategoryName('');
    setShowNewCategory(false);
  };

  const handleSetPendingSeries = () => {
    if (!newSeriesName.trim()) return;
    // Check for duplicates in existing series
    if (series.some(s => s.name.toLowerCase() === newSeriesName.trim().toLowerCase())) {
      alert('A series with this name already exists. Please select from the dropdown.');
      return;
    }
    setPendingSeries({ name: newSeriesName.trim(), description: '' });
    // Clear the selected series ID since we're using a pending one
    setFormData((prev) => ({ ...prev, seriesId: undefined }));
    setNewSeriesName('');
    setShowNewSeries(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={book ? 'Edit Book' : 'Add New Book'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {errors.submit}
          </div>
        )}

        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
          
          <Input
            label="Title *"
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            error={errors.title}
            placeholder="Enter book title"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="ISBN"
              value={formData.isbn || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, isbn: e.target.value }))}
              placeholder="e.g., 978-0-123456-78-9"
            />
            <Input
              label="Publication Year"
              type="number"
              value={formData.publicationYear || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, publicationYear: e.target.value ? parseInt(e.target.value) : undefined }))}
              error={errors.publicationYear}
              placeholder="e.g., 2023"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Pages"
              type="number"
              value={formData.pages || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, pages: e.target.value ? parseInt(e.target.value) : undefined }))}
              error={errors.pages}
              placeholder="e.g., 350"
            />
            <Input
              label="Rating (0-5)"
              type="number"
              step="0.5"
              min="0"
              max="5"
              value={formData.rating || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, rating: e.target.value ? parseFloat(e.target.value) : undefined }))}
              error={errors.rating}
              placeholder="e.g., 4.5"
            />
          </div>

          <Textarea
            label="Description"
            value={formData.description || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Enter book description..."
            rows={3}
          />
        </div>

        {/* Authors */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Authors</h3>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewAuthor(!showNewAuthor)}>
              + New Author
            </Button>
          </div>
          
          {showNewAuthor && (
            <div className="flex gap-2">
              <Input
                value={newAuthorName}
                onChange={(e) => setNewAuthorName(e.target.value)}
                placeholder="Author name"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPendingAuthor())}
              />
              <Button type="button" onClick={handleAddPendingAuthor}>Add</Button>
            </div>
          )}

          {/* Show pending authors that will be created with the book */}
          {pendingAuthors.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {pendingAuthors.map((name, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-sm"
                >
                  <span className="text-xs">✨</span> {name} (new)
                  <button
                    type="button"
                    onClick={() => setPendingAuthors((prev) => prev.filter((_, i) => i !== idx))}
                    className="ml-1 text-amber-600 hover:text-amber-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <MultiSelect
            options={authors.map((a) => ({ value: a.id, label: a.name }))}
            selectedValues={formData.authorIds || []}
            onChange={(values) => setFormData((prev) => ({ ...prev, authorIds: values }))}
            placeholder="Select authors..."
          />
        </div>

        {/* Publisher & Category */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Publisher & Category</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Select
                label="Publisher *"
                value={formData.publisherId}
                onChange={(e) => setFormData((prev) => ({ ...prev, publisherId: e.target.value }))}
                options={publishers.map((p) => ({ value: p.id, label: p.name }))}
                placeholder="Select publisher..."
                error={errors.publisherId}
              />
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewPublisher(!showNewPublisher)} className="ml-2 mt-6">
              + New
            </Button>
          </div>

          {showNewPublisher && (
            <div className="flex gap-2">
              <Input
                value={newPublisherName}
                onChange={(e) => setNewPublisherName(e.target.value)}
                placeholder="Publisher name"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSetPendingPublisher())}
              />
              <Button type="button" onClick={handleSetPendingPublisher}>Add</Button>
            </div>
          )}

          {/* Show pending publisher that will be created with the book */}
          {pendingPublisher && (
            <div className="flex items-center gap-2 p-2 bg-amber-100 text-amber-800 rounded-lg text-sm">
              <span className="text-xs">✨</span> New publisher: <strong>{pendingPublisher}</strong>
              <button
                type="button"
                onClick={() => setPendingPublisher(null)}
                className="ml-auto text-amber-600 hover:text-amber-800"
              >
                × Remove
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Select
                label="Category *"
                value={formData.categoryId}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, categoryId: e.target.value }));
                  if (e.target.value) setPendingCategory(null); // Clear pending if selecting existing
                }}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Select category..."
                error={errors.categoryId}
                disabled={!!pendingCategory}
              />
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewCategory(!showNewCategory)} className="ml-2 mt-6">
              + New
            </Button>
          </div>

          {showNewCategory && (
            <div className="flex gap-2">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSetPendingCategory())}
              />
              <Button type="button" onClick={handleSetPendingCategory}>Add</Button>
            </div>
          )}

          {/* Show pending category that will be created with the book */}
          {pendingCategory && (
            <div className="flex items-center gap-2 p-2 bg-amber-100 text-amber-800 rounded-lg text-sm">
              <span className="text-xs">✨</span> New category: <strong>{pendingCategory.name}</strong>
              <button
                type="button"
                onClick={() => setPendingCategory(null)}
                className="ml-auto text-amber-600 hover:text-amber-800"
              >
                × Remove
              </button>
            </div>
          )}
        </div>

        {/* Series */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Series</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex-1 grid grid-cols-2 gap-4">
              <Select
                label="Series"
                value={formData.seriesId || ''}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, seriesId: e.target.value || undefined }));
                  if (e.target.value) setPendingSeries(null); // Clear pending if selecting existing
                }}
                options={series.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Select series..."
                disabled={!!pendingSeries}
              />
              <Input
                label="Order in Series"
                type="number"
                value={formData.seriesOrder || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, seriesOrder: e.target.value ? parseInt(e.target.value) : undefined }))}
                placeholder="e.g., 1"
                disabled={!formData.seriesId && !pendingSeries}
              />
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewSeries(!showNewSeries)} className="ml-2 mt-6">
              + New
            </Button>
          </div>

          {showNewSeries && (
            <div className="flex gap-2">
              <Input
                value={newSeriesName}
                onChange={(e) => setNewSeriesName(e.target.value)}
                placeholder="Series name"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSetPendingSeries())}
              />
              <Button type="button" onClick={handleSetPendingSeries}>Add</Button>
            </div>
          )}

          {/* Show pending series that will be created with the book */}
          {pendingSeries && (
            <div className="flex items-center gap-2 p-2 bg-amber-100 text-amber-800 rounded-lg text-sm">
              <span className="text-xs">✨</span> New series: <strong>{pendingSeries.name}</strong>
              <span className="text-xs text-amber-600">(will use this book's authors)</span>
              <button
                type="button"
                onClick={() => setPendingSeries(null)}
                className="ml-auto text-amber-600 hover:text-amber-800"
              >
                × Remove
              </button>
            </div>
          )}
        </div>

        {/* Genres & Topics */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Genres & Topics</h3>
          
          <MultiSelect
            label="Genres"
            options={genres.map((g) => ({ value: g.id, label: g.name }))}
            selectedValues={formData.genreIds || []}
            onChange={(values) => setFormData((prev) => ({ ...prev, genreIds: values }))}
            placeholder="Select genres..."
          />

          <MultiSelect
            label="Topics"
            options={topics.map((t) => ({ value: t.id, label: t.name }))}
            selectedValues={formData.topicIds || []}
            onChange={(values) => setFormData((prev) => ({ ...prev, topicIds: values }))}
            placeholder="Select topics..."
          />
        </div>

        {/* Reading Progress */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Reading Progress</h3>
          
          <Select
            label="Status"
            value={formData.readingStatus}
            onChange={(e) => setFormData((prev) => ({ ...prev, readingStatus: e.target.value as ReadingStatusType }))}
            options={[
              { value: 'unread', label: '📖 Unread' },
              { value: 'reading', label: '📚 Reading' },
              { value: 'completed', label: '✅ Completed' },
            ]}
          />

          <Textarea
            label="Notes"
            value={formData.notes || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Add your reading notes..."
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {book ? 'Save Changes' : 'Add Book'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
