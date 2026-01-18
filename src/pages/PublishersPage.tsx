import { useEffect, useState } from 'react';
import type { PublisherWithStats, PublisherInput } from '../shared/types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingPage } from '../components/ui/LoadingSpinner';

export function PublishersPage() {
  const [publishers, setPublishers] = useState<PublisherWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPublisher, setSelectedPublisher] = useState<PublisherWithStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<PublisherInput>({ name: '', location: '', website: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadPublishers();
  }, []);

  const loadPublishers = async () => {
    try {
      setLoading(true);
      const data = await window.electronAPI.getAllPublishers();
      setPublishers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Note: Publishers can only be created via the Book form (inline creation)
  // This page only allows editing existing publishers

  const handleEdit = (publisher: PublisherWithStats) => {
    setSelectedPublisher(publisher);
    setFormData({ name: publisher.name, location: publisher.location || '', website: publisher.website || '' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = async (publisher: PublisherWithStats) => {
    if (publisher.bookCount > 0) {
      alert(
        `Cannot delete "${publisher.name}" because they have ${publisher.bookCount} book(s).\n\n` +
        `To delete this publisher, first reassign all their books to another publisher.`
      );
      return;
    }
    
    if (!confirm(`Are you sure you want to delete "${publisher.name}"?`)) return;
    try {
      await window.electronAPI.deletePublisher(publisher.id);
      await loadPublishers();
    } catch (err: any) {
      alert(`Failed to delete publisher: ${err.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setFormErrors({ name: 'Name is required' });
      return;
    }

    if (!selectedPublisher) {
      setFormErrors({ submit: 'Publishers can only be created when adding a book. Use the "Add Book" feature to create new publishers.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await window.electronAPI.updatePublisher(selectedPublisher.id, formData);
      setIsModalOpen(false);
      await loadPublishers();
    } catch (err: any) {
      setFormErrors({ submit: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPublishers = publishers.filter(
    (p) => p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <LoadingPage />;

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error: {error}</p>
        <Button onClick={loadPublishers} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Publishers</h1>
          <p className="text-gray-500 mt-1">{publishers.length} publishers in your library</p>
        </div>
        {/* Info about publisher creation */}
        <div className="text-sm text-gray-500 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
          💡 Publishers are created when adding books
        </div>
      </div>

      <div className="card">
        <Input
          placeholder="Search publishers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredPublishers.length === 0 ? (
        <EmptyState
          icon="🏢"
          title="No publishers found"
          description={searchQuery ? "No publishers match your search." : "Publishers will appear here when you add books with publisher information."}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPublishers.map((publisher) => (
            <div key={publisher.id} className="card hover:shadow-md transition-shadow">
              <div className="mb-3">
                <h3 className="font-semibold text-gray-900">{publisher.name}</h3>
                <p className="text-sm text-gray-500">{publisher.bookCount} books</p>
              </div>
              {publisher.location && (
                <p className="text-sm text-gray-600 mb-1">📍 {publisher.location}</p>
              )}
              {publisher.website && (
                <p className="text-sm text-gray-600 mb-4 truncate">🌐 {publisher.website}</p>
              )}
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(publisher)}>Edit</Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDelete(publisher)}
                  disabled={publisher.bookCount > 0}
                  title={publisher.bookCount > 0 ? 'Reassign all books to another publisher first' : undefined}
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
        title="Edit Publisher"
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
            placeholder="Enter publisher name"
          />
          <Input
            label="Location"
            value={formData.location || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
            placeholder="e.g., New York, USA"
          />
          <Input
            label="Website"
            value={formData.website || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
            placeholder="e.g., https://publisher.com"
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
