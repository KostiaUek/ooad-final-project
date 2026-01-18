import { useEffect, useState } from 'react';
import type { SeriesWithAuthors, SeriesInput, AuthorWithStats } from '../shared/types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Modal } from '../components/ui/Modal';
import { MultiSelect } from '../components/ui/MultiSelect';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingPage } from '../components/ui/LoadingSpinner';

export function SeriesPage() {
  const [seriesList, setSeriesList] = useState<SeriesWithAuthors[]>([]);
  const [authors, setAuthors] = useState<AuthorWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<SeriesWithAuthors | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<SeriesInput>({ name: '', description: '', authorIds: [] });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [seriesData, authorsData] = await Promise.all([
        window.electronAPI.getAllSeries(),
        window.electronAPI.getAllAuthors(),
      ]);
      setSeriesList(seriesData);
      setAuthors(authorsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Note: Series can only be created via the Book form (when adding a book to a new series)
  // This ensures series always have at least one book (business rule enforcement)

  const handleEdit = (series: SeriesWithAuthors) => {
    setSelectedSeries(series);
    setFormData({
      name: series.name,
      description: series.description || '',
      authorIds: series.authors.map((a) => a.id),
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = async (series: SeriesWithAuthors) => {
    if (series.bookCount > 0) {
      alert(
        `Cannot delete "${series.name}" because it has ${series.bookCount} book(s).\n\n` +
        `To delete this series, first remove all books from it (edit each book and clear the series field).`
      );
      return;
    }
    
    if (!confirm(`Are you sure you want to delete "${series.name}"?`)) return;
    try {
      await window.electronAPI.deleteSeries(series.id);
      await loadData();
    } catch (err: any) {
      alert(`Failed to delete series: ${err.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Series can only be edited here, not created (creation happens via book form)
    if (!selectedSeries) {
      setFormErrors({ submit: 'Series can only be created when adding a book. Use the "Add Book" feature to create new series.' });
      return;
    }

    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.authorIds || formData.authorIds.length === 0) errors.authorIds = 'At least one author is required';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await window.electronAPI.updateSeries(selectedSeries.id, formData);
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormErrors({ submit: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSeries = seriesList.filter(
    (s) => s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <LoadingPage />;

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error: {error}</p>
        <Button onClick={loadData} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Series</h1>
          <p className="text-gray-500 mt-1">{seriesList.length} series in your library</p>
        </div>
        {/* Info about series creation */}
        <div className="text-sm text-gray-500 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
          💡 Series are created when adding books
        </div>
      </div>

      <div className="card">
        <Input
          placeholder="Search series..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredSeries.length === 0 ? (
        <EmptyState
          icon="📖"
          title="No series found"
          description={searchQuery ? "No series match your search." : "Series are created when adding a book. Use the 'Add Book' feature and select or create a series."}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSeries.map((series) => (
            <div key={series.id} className="card hover:shadow-md transition-shadow">
              <div className="mb-3">
                <h3 className="font-semibold text-gray-900">{series.name}</h3>
                <p className="text-sm text-gray-500">{series.bookCount} books</p>
              </div>
              {series.authors.length > 0 && (
                <p className="text-sm text-gray-600 mb-2">
                  By: {series.authors.map((a) => a.name).join(', ')}
                </p>
              )}
              {series.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-4">{series.description}</p>
              )}
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(series)}>Edit</Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDelete(series)}
                  disabled={series.bookCount > 0}
                  title={series.bookCount > 0 ? 'Remove all books from this series first' : undefined}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedSeries ? 'Edit Series' : 'Add Series'}
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
            placeholder="Enter series name"
          />
          <MultiSelect
            label="Authors *"
            options={authors.map((a) => ({ value: a.id, label: a.name }))}
            selectedValues={formData.authorIds}
            onChange={(values) => setFormData((prev) => ({ ...prev, authorIds: values }))}
            placeholder="Select authors..."
            error={formErrors.authorIds}
          />
          <Textarea
            label="Description"
            value={formData.description || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Enter series description..."
            rows={3}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
