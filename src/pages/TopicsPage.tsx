import { useEffect, useState } from 'react';
import type { TopicWithStats, TopicInput } from '../shared/types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingPage } from '../components/ui/LoadingSpinner';

export function TopicsPage() {
  const [topics, setTopics] = useState<TopicWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<TopicWithStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<TopicInput>({ name: '', description: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      setLoading(true);
      const data = await window.electronAPI.getAllTopics();
      setTopics(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedTopic(null);
    setFormData({ name: '', description: '' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = (topic: TopicWithStats) => {
    setSelectedTopic(topic);
    setFormData({ name: topic.name, description: topic.description || '' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = async (topic: TopicWithStats) => {
    if (!confirm(`Are you sure you want to delete "${topic.name}"?`)) return;
    try {
      await window.electronAPI.deleteTopic(topic.id);
      await loadTopics();
    } catch (err: any) {
      alert(`Failed to delete topic: ${err.message}`);
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
      if (selectedTopic) {
        await window.electronAPI.updateTopic(selectedTopic.id, formData);
      } else {
        await window.electronAPI.createTopic(formData);
      }
      setIsModalOpen(false);
      await loadTopics();
    } catch (err: any) {
      setFormErrors({ submit: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTopics = topics.filter(
    (t) => t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <LoadingPage />;

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error: {error}</p>
        <Button onClick={loadTopics} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Topics</h1>
          <p className="text-gray-500 mt-1">{topics.length} topics in your library</p>
        </div>
        <Button onClick={handleAdd}>+ Add Topic</Button>
      </div>

      <div className="card">
        <Input
          placeholder="Search topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredTopics.length === 0 ? (
        <EmptyState
          icon="💡"
          title="No topics found"
          description={searchQuery ? "No topics match your search." : "Add topics to tag your books with specific subjects."}
          action={!searchQuery ? { label: 'Add Topic', onClick: handleAdd } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredTopics.map((topic) => (
            <div key={topic.id} className="card hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{topic.name}</h3>
                  <p className="text-sm text-gray-500">{topic.bookCount} books</p>
                </div>
              </div>
              {topic.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-4">{topic.description}</p>
              )}
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(topic)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(topic)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedTopic ? 'Edit Topic' : 'Add Topic'}
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
            placeholder="Enter topic name"
          />
          <Textarea
            label="Description"
            value={formData.description || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Enter topic description..."
            rows={3}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {selectedTopic ? 'Save Changes' : 'Add Topic'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
