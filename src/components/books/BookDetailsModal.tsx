import { useState } from 'react';
import type { BookWithRelations, ReadingStatusType } from '../../shared/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { Textarea } from '../ui/Textarea';

interface BookDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: BookWithRelations | null;
  onUpdateProgress: (bookId: string, status: ReadingStatusType, notes?: string) => void;
  onEdit: (book: BookWithRelations) => void;
}

export function BookDetailsModal({
  isOpen,
  onClose,
  book,
  onUpdateProgress,
  onEdit,
}: BookDetailsModalProps) {
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ReadingStatusType>('unread');

  if (!book) return null;

  const handleStartEditProgress = () => {
    setNotes(book.notes || '');
    setSelectedStatus(book.readingStatus);
    setIsEditingProgress(true);
  };

  const handleSaveProgress = () => {
    onUpdateProgress(book.id, selectedStatus, notes);
    setIsEditingProgress(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={book.title} size="lg">
      <div className="space-y-6">
        {/* Status & Quick Actions */}
        <div className="flex items-center justify-between">
          <StatusBadge status={book.readingStatus} />
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleStartEditProgress}>
              Update Progress
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { onClose(); onEdit(book); }}>
              Edit Book
            </Button>
          </div>
        </div>

        {/* Progress Editor */}
        {isEditingProgress && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            <h4 className="font-medium">Update Reading Progress</h4>
            <div className="flex gap-2">
              {(['unread', 'reading', 'completed'] as ReadingStatusType[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedStatus === status
                      ? 'bg-primary-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {status === 'unread' ? '📖 Unread' : status === 'reading' ? '📚 Reading' : '✅ Completed'}
                </button>
              ))}
            </div>
            <Textarea
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your thoughts, favorite quotes, or reading notes..."
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsEditingProgress(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveProgress}>
                Save Progress
              </Button>
            </div>
          </div>
        )}

        {/* Book Details */}
        <div className="grid grid-cols-2 gap-4">
          {book.authors.length > 0 && (
            <div>
              <span className="text-sm text-gray-500">Authors</span>
              <p className="font-medium">{book.authors.map((a) => a.name).join(', ')}</p>
            </div>
          )}
          {book.publisher && (
            <div>
              <span className="text-sm text-gray-500">Publisher</span>
              <p className="font-medium">{book.publisher.name}</p>
            </div>
          )}
          {book.publicationYear && (
            <div>
              <span className="text-sm text-gray-500">Publication Year</span>
              <p className="font-medium">{book.publicationYear}</p>
            </div>
          )}
          {book.pages && (
            <div>
              <span className="text-sm text-gray-500">Pages</span>
              <p className="font-medium">{book.pages}</p>
            </div>
          )}
          {book.isbn && (
            <div>
              <span className="text-sm text-gray-500">ISBN</span>
              <p className="font-medium">{book.isbn}</p>
            </div>
          )}
          {book.rating !== undefined && (
            <div>
              <span className="text-sm text-gray-500">Rating</span>
              <p className="font-medium">{'⭐'.repeat(Math.floor(book.rating))} {book.rating}/5</p>
            </div>
          )}
          {book.category && (
            <div>
              <span className="text-sm text-gray-500">Category</span>
              <p className="font-medium">
                <span 
                  className="inline-block w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: book.category.color || '#3b82f6' }}
                ></span>
                {book.category.name}
              </p>
            </div>
          )}
          {book.series && (
            <div>
              <span className="text-sm text-gray-500">Series</span>
              <p className="font-medium">
                {book.series.name}
                {book.seriesOrder && ` (#${book.seriesOrder})`}
              </p>
            </div>
          )}
        </div>

        {/* Genres */}
        {book.genres.length > 0 && (
          <div>
            <span className="text-sm text-gray-500 block mb-2">Genres</span>
            <div className="flex flex-wrap gap-2">
              {book.genres.map((genre) => (
                <span key={genre.id} className="px-2 py-1 bg-gray-100 rounded text-sm">
                  {genre.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Topics */}
        {book.topics.length > 0 && (
          <div>
            <span className="text-sm text-gray-500 block mb-2">Topics</span>
            <div className="flex flex-wrap gap-2">
              {book.topics.map((topic) => (
                <span key={topic.id} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                  {topic.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {book.description && (
          <div>
            <span className="text-sm text-gray-500 block mb-2">Description</span>
            <p className="text-gray-700 whitespace-pre-wrap">{book.description}</p>
          </div>
        )}

        {/* Notes */}
        {book.notes && !isEditingProgress && (
          <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
            <span className="text-sm text-yellow-800 font-medium block mb-2">📝 Your Notes</span>
            <p className="text-gray-700 whitespace-pre-wrap">{book.notes}</p>
          </div>
        )}

        {/* Metadata */}
        <div className="text-xs text-gray-400 border-t border-gray-100 pt-4">
          <p>Added: {new Date(book.createdAt).toLocaleDateString()}</p>
          <p>Last updated: {new Date(book.updatedAt).toLocaleDateString()}</p>
        </div>
      </div>
    </Modal>
  );
}
