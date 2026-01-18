import { useEffect, useState } from 'react';
import type { AuthorWithStats, AuthorInput } from '../shared/types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingPage } from '../components/ui/LoadingSpinner';

export function AuthorsPage() {
  const [authors, setAuthors] = useState<AuthorWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState<AuthorWithStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<AuthorInput>({ name: '', bio: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAuthors();
  }, []);

  const loadAuthors = async () => {
    try {
      setLoading(true);
      const data = await window.electronAPI.getAllAuthors();
      setAuthors(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Note: Authors can only be created via the Book form (inline creation)
  // This page only allows editing existing authors and viewing their books

  const handleEdit = (author: AuthorWithStats) => {
    setSelectedAuthor(author);
    setFormData({ name: author.name, bio: author.bio || '' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = async (author: AuthorWithStats) => {
    if (author.bookCount > 0) {
      alert(
        `Cannot delete "${author.name}" because they have ${author.bookCount} book(s).\n\n` +
        `To delete this author, first remove them from all their books, or delete those books.`
      );
      return;
    }

    // Check if deleting this author would leave any series without authors
    try {
      const impact = await window.electronAPI.checkAuthorDeleteImpact(author.id);
      if (impact.hasImpact) {
        const seriesNames = impact.seriesWithNoAuthors.map(s => s.name).join(', ');
        alert(
          `Cannot delete "${author.name}" because they are the only author of the following series:\n\n` +
          `${seriesNames}\n\n` +
          `To delete this author, first add another author to these series, or delete the series.`
        );
        return;
      }
    } catch (err: any) {
      alert(`Failed to check deletion impact: ${err.message}`);
      return;
    }
    
    if (!confirm(`Are you sure you want to delete "${author.name}"?`)) return;
    try {
      await window.electronAPI.deleteAuthor(author.id);
      await loadAuthors();
    } catch (err: any) {
      alert(`Failed to delete author: ${err.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setFormErrors({ name: 'Name is required' });
      return;
    }

    if (!selectedAuthor) {
      setFormErrors({ submit: 'Authors can only be created when adding a book. Use the "Add Book" feature to create new authors.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await window.electronAPI.updateAuthor(selectedAuthor.id, formData);
      setIsModalOpen(false);
      await loadAuthors();
    } catch (err: any) {
      setFormErrors({ submit: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAuthors = authors.filter(
    (a) => a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <LoadingPage />;

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error: {error}</p>
        <Button onClick={loadAuthors} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Authors</h1>
          <p className="text-gray-500 mt-1">{authors.length} authors in your library</p>
        </div>
        {/* Info about author creation */}
        <div className="text-sm text-gray-500 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
          💡 Authors are created when adding books
        </div>
      </div>

      <div className="card">
        <Input
          placeholder="Search authors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredAuthors.length === 0 ? (
        <EmptyState
          icon="✍️"
          title="No authors found"
          description={searchQuery ? "No authors match your search." : "Authors will appear here when you add books with author information."}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAuthors.map((author) => (
            <div key={author.id} className="card hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{author.name}</h3>
                  <p className="text-sm text-gray-500">{author.bookCount} books • {author.seriesCount} series</p>
                </div>
              </div>
              {author.bio && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-4">{author.bio}</p>
              )}
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(author)}>Edit</Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDelete(author)}
                  disabled={author.bookCount > 0}
                  title={author.bookCount > 0 ? 'Remove author from all books first' : undefined}
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
        title="Edit Author"
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
            placeholder="Enter author name"
          />
          <Textarea
            label="Bio"
            value={formData.bio || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
            placeholder="Enter author biography..."
            rows={4}
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
