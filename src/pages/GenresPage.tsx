import { useEffect, useState } from 'react';
import type { GenreWithStats, GenreInput } from '../shared/types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingPage } from '../components/ui/LoadingSpinner';

export function GenresPage() {
  const [genres, setGenres] = useState<GenreWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<GenreWithStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<GenreInput>({ name: '', description: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadGenres();
  }, []);

  const loadGenres = async () => {
    try {
      setLoading(true);
      const data = await window.electronAPI.getAllGenres();
      setGenres(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedGenre(null);
    setFormData({ name: '', description: '' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = (genre: GenreWithStats) => {
    setSelectedGenre(genre);
    setFormData({ name: genre.name, description: genre.description || '' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = async (genre: GenreWithStats) => {
    if (!confirm(`Are you sure you want to delete "${genre.name}"?`)) return;
    try {
      await window.electronAPI.deleteGenre(genre.id);
      await loadGenres();
    } catch (err: any) {
      alert(`Failed to delete genre: ${err.message}`);
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
      if (selectedGenre) {
        await window.electronAPI.updateGenre(selectedGenre.id, formData);
      } else {
        await window.electronAPI.createGenre(formData);
      }
      setIsModalOpen(false);
      await loadGenres();
    } catch (err: any) {
      setFormErrors({ submit: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredGenres = genres.filter(
    (g) => g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <LoadingPage />;

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error: {error}</p>
        <Button onClick={loadGenres} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Genres</h1>
          <p className="text-gray-500 mt-1">{genres.length} genres in your library</p>
        </div>
        <Button onClick={handleAdd}>+ Add Genre</Button>
      </div>

      <div className="card">
        <Input
          placeholder="Search genres..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredGenres.length === 0 ? (
        <EmptyState
          icon="🏷️"
          title="No genres found"
          description={searchQuery ? "No genres match your search." : "Add genres to categorize your books."}
          action={!searchQuery ? { label: 'Add Genre', onClick: handleAdd } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredGenres.map((genre) => (
            <div key={genre.id} className="card hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{genre.name}</h3>
                  <p className="text-sm text-gray-500">{genre.bookCount} books</p>
                </div>
              </div>
              {genre.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-4">{genre.description}</p>
              )}
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(genre)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(genre)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedGenre ? 'Edit Genre' : 'Add Genre'}
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
            placeholder="Enter genre name"
          />
          <Textarea
            label="Description"
            value={formData.description || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Enter genre description..."
            rows={3}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {selectedGenre ? 'Save Changes' : 'Add Genre'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
