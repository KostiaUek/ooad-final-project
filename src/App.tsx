import { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { BooksPage } from './pages/BooksPage';
import { AuthorsPage } from './pages/AuthorsPage';
import { PublishersPage } from './pages/PublishersPage';
import { SeriesPage } from './pages/SeriesPage';
import { GenresPage } from './pages/GenresPage';
import { TopicsPage } from './pages/TopicsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ImportExportPage } from './pages/ImportExportPage';

export type PageType = 
  | 'dashboard'
  | 'books'
  | 'authors'
  | 'publishers'
  | 'series'
  | 'genres'
  | 'topics'
  | 'categories'
  | 'import-export';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'books':
        return <BooksPage />;
      case 'authors':
        return <AuthorsPage />;
      case 'publishers':
        return <PublishersPage />;
      case 'series':
        return <SeriesPage />;
      case 'genres':
        return <GenresPage />;
      case 'topics':
        return <TopicsPage />;
      case 'categories':
        return <CategoriesPage />;
      case 'import-export':
        return <ImportExportPage />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;
