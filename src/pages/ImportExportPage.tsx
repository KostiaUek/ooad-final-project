import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export function ImportExportPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importStats, setImportStats] = useState<any>(null);

  const handleExportJSON = async () => {
    try {
      setIsExporting(true);
      setMessage(null);
      const filePath = await window.electronAPI.selectExportPath('json');
      if (!filePath) return;
      await window.electronAPI.exportToJson(filePath);
      setMessage({ type: 'success', text: `Library exported successfully to ${filePath}` });
    } catch (err: any) {
      setMessage({ type: 'error', text: `Export failed: ${err.message}` });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportBooksCSV = async () => {
    try {
      setIsExporting(true);
      setMessage(null);
      const filePath = await window.electronAPI.selectExportPath('csv');
      if (!filePath) return;
      await window.electronAPI.exportToCsv(filePath);
      setMessage({ type: 'success', text: `Books exported successfully to ${filePath}` });
    } catch (err: any) {
      setMessage({ type: 'error', text: `Export failed: ${err.message}` });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportJSON = async () => {
    try {
      setIsImporting(true);
      setMessage(null);
      setImportStats(null);
      const filePath = await window.electronAPI.selectImportFile();
      if (!filePath) return;

      const result = await window.electronAPI.importFromJson(filePath);
      setImportStats(result);
      setMessage({ type: 'success', text: 'Library imported successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: `Import failed: ${err.message}` });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Import & Export</h1>
        <p className="text-gray-500 mt-1">Backup your library or transfer data</p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Section */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">📤</span>
            <h2 className="text-xl font-semibold text-gray-900">Export Library</h2>
          </div>
          <p className="text-gray-600 mb-6">
            Export your library data to back it up or transfer to another computer.
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">JSON Export (Full Backup)</h3>
              <p className="text-sm text-gray-600 mb-3">
                Exports your entire library including all books, authors, publishers, series,
                genres, topics, and categories. Best for full backups and transfers.
              </p>
              <Button onClick={handleExportJSON} disabled={isExporting}>
                {isExporting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Exporting...
                  </>
                ) : (
                  'Export as JSON'
                )}
              </Button>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">CSV Export (Books Only)</h3>
              <p className="text-sm text-gray-600 mb-3">
                Exports your books as a CSV file. Great for viewing in spreadsheet applications
                or sharing book lists.
              </p>
              <Button onClick={handleExportBooksCSV} variant="secondary" disabled={isExporting}>
                {isExporting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Exporting...
                  </>
                ) : (
                  'Export Books as CSV'
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Import Section */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">📥</span>
            <h2 className="text-xl font-semibold text-gray-900">Import Library</h2>
          </div>
          <p className="text-gray-600 mb-6">
            Import library data from a previously exported JSON file.
          </p>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">JSON Import</h3>
            <p className="text-sm text-gray-600 mb-3">
              Imports books and related data from a JSON export file. Existing data will be
              preserved; only new items will be added.
            </p>
            <Button onClick={handleImportJSON} disabled={isImporting}>
              {isImporting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Importing...
                </>
              ) : (
                'Import from JSON'
              )}
            </Button>
          </div>

          {importStats && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Import Summary</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Authors: {importStats.authors} imported</li>
                <li>• Publishers: {importStats.publishers} imported</li>
                <li>• Series: {importStats.series} imported</li>
                <li>• Genres: {importStats.genres} imported</li>
                <li>• Topics: {importStats.topics} imported</li>
                <li>• Categories: {importStats.categories} imported</li>
                <li>• Books: {importStats.books} imported</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Tips Section */}
      <div className="card bg-blue-50">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Tips for Import/Export</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use JSON export for complete backups that include all library data</li>
              <li>• CSV exports are view-only and cannot be imported back</li>
              <li>• When importing, duplicate entries (matching by ID) will be skipped</li>
              <li>• Regular backups help protect your library data</li>
              <li>• Store exports in a safe location like cloud storage</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
