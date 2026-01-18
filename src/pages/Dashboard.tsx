import { useEffect, useState } from 'react';
import type { LibraryStats } from '../shared/types';
import type { PageType } from '../App';
import { LoadingPage } from '../components/ui/LoadingSpinner';
import { StatusBadge } from '../components/ui/StatusBadge';

interface DashboardProps {
  onNavigate: (page: PageType) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await window.electronAPI.getLibraryStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingPage />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading statistics: {error}</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    { label: 'Total Books', value: stats.totalBooks, icon: '📚', color: 'bg-blue-500', onClick: () => onNavigate('books') },
    { label: 'Authors', value: stats.totalAuthors, icon: '✍️', color: 'bg-purple-500', onClick: () => onNavigate('authors') },
    { label: 'Publishers', value: stats.totalPublishers, icon: '🏢', color: 'bg-green-500', onClick: () => onNavigate('publishers') },
    { label: 'Series', value: stats.totalSeries, icon: '📖', color: 'bg-orange-500', onClick: () => onNavigate('series') },
    { label: 'Genres', value: stats.totalGenres, icon: '🏷️', color: 'bg-pink-500', onClick: () => onNavigate('genres') },
    { label: 'Categories', value: stats.totalCategories, icon: '📁', color: 'bg-indigo-500', onClick: () => onNavigate('categories') },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome to your personal library</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <button
            key={card.label}
            onClick={card.onClick}
            className="card hover:shadow-md transition-shadow cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center text-2xl`}>
                {card.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-sm text-gray-500">{card.label}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Reading Progress Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reading Status Breakdown */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Reading Progress</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                <span className="text-gray-700">Unread</span>
              </div>
              <span className="font-semibold">{stats.readingStatusBreakdown.unread}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gray-400 h-2 rounded-full"
                style={{ width: `${stats.totalBooks > 0 ? (stats.readingStatusBreakdown.unread / stats.totalBooks) * 100 : 0}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <span className="text-gray-700">Reading</span>
              </div>
              <span className="font-semibold">{stats.readingStatusBreakdown.reading}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${stats.totalBooks > 0 ? (stats.readingStatusBreakdown.reading / stats.totalBooks) * 100 : 0}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span className="text-gray-700">Completed</span>
              </div>
              <span className="font-semibold">{stats.readingStatusBreakdown.completed}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${stats.totalBooks > 0 ? (stats.readingStatusBreakdown.completed / stats.totalBooks) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Top Genres */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Genres</h2>
          {stats.topGenres.length === 0 ? (
            <p className="text-gray-500">No genres yet. Add books to see your top genres.</p>
          ) : (
            <div className="space-y-3">
              {stats.topGenres.map((genre, index) => (
                <div key={genre.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{genre.name}</span>
                  </div>
                  <span className="text-gray-500">{genre.count} books</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Books & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Books */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Books</h2>
            <button
              onClick={() => onNavigate('books')}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              View all →
            </button>
          </div>
          {stats.recentBooks.length === 0 ? (
            <p className="text-gray-500">No books yet. Start by adding your first book!</p>
          ) : (
            <div className="space-y-3">
              {stats.recentBooks.map((book) => (
                <div key={book.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{book.title}</p>
                    <p className="text-sm text-gray-500">
                      {book.authors.map((a) => a.name).join(', ') || 'Unknown Author'}
                    </p>
                  </div>
                  <StatusBadge status={book.readingStatus} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommended Books */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📚 Recommended for You</h2>
          {stats.recommendedBooks.length === 0 ? (
            <p className="text-gray-500">Complete some books to get personalized recommendations!</p>
          ) : (
            <div className="space-y-3">
              {stats.recommendedBooks.map((book) => (
                <div key={book.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{book.title}</p>
                    <p className="text-sm text-gray-500">
                      {book.genres.map((g) => g.name).join(', ') || 'No genres'}
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate('books')}
                    className="text-primary-600 hover:text-primary-700 text-sm"
                  >
                    View →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
