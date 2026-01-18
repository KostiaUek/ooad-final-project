import type { PageType } from '../../App';

interface SidebarProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
}

const menuItems: { id: PageType; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'books', label: 'Books', icon: '📚' },
  { id: 'authors', label: 'Authors', icon: '✍️' },
  { id: 'publishers', label: 'Publishers', icon: '🏢' },
  { id: 'series', label: 'Series', icon: '📖' },
  { id: 'genres', label: 'Genres', icon: '🏷️' },
  { id: 'topics', label: 'Topics', icon: '💡' },
  { id: 'categories', label: 'Categories', icon: '📁' },
  { id: 'import-export', label: 'Import / Export', icon: '📤' },
];

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="Home Library" className="w-10 h-10" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Home Library</h1>
            <p className="text-xs text-gray-500">Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  currentPage === item.id
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-400 text-center">
          Home Library Manager v1.0.0
        </p>
      </div>
    </aside>
  );
}
