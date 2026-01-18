import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../src/shared/ipc';
import type { ElectronAPI } from '../src/shared/ipc';
import type {
  AuthorInput,
  BookInput,
  BookSearchParams,
  CategoryInput,
  GenreInput,
  PublisherInput,
  ReadingProgressUpdate,
  SeriesInput,
  TopicInput,
} from '../src/shared/types';

// Create a typed API that exposes safe IPC methods to the renderer
const electronAPI: ElectronAPI = {
  // Book operations
  createBook: (input: BookInput) => ipcRenderer.invoke(IPC_CHANNELS.BOOK_CREATE, input),
  updateBook: (id: string, input: BookInput, options?: { cleanupOrphans?: boolean }) => ipcRenderer.invoke(IPC_CHANNELS.BOOK_UPDATE, id, input, options),
  deleteBook: (id: string, options?: { cleanupOrphans?: boolean }) => ipcRenderer.invoke(IPC_CHANNELS.BOOK_DELETE, id, options),
  getBook: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.BOOK_GET, id),
  getAllBooks: () => ipcRenderer.invoke(IPC_CHANNELS.BOOK_GET_ALL),
  searchBooks: (params: BookSearchParams) => ipcRenderer.invoke(IPC_CHANNELS.BOOK_SEARCH, params),
  updateReadingProgress: (update: ReadingProgressUpdate) => ipcRenderer.invoke(IPC_CHANNELS.BOOK_UPDATE_PROGRESS, update),
  checkBookDeleteImpact: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.BOOK_CHECK_DELETE_IMPACT, id),
  checkBookUpdateImpact: (id: string, input: BookInput) => ipcRenderer.invoke(IPC_CHANNELS.BOOK_CHECK_UPDATE_IMPACT, id, input),

  // Author operations
  createAuthor: (input: AuthorInput) => ipcRenderer.invoke(IPC_CHANNELS.AUTHOR_CREATE, input),
  updateAuthor: (id: string, input: AuthorInput) => ipcRenderer.invoke(IPC_CHANNELS.AUTHOR_UPDATE, id, input),
  deleteAuthor: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.AUTHOR_DELETE, id),
  getAuthor: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.AUTHOR_GET, id),
  getAllAuthors: () => ipcRenderer.invoke(IPC_CHANNELS.AUTHOR_GET_ALL),
  checkAuthorDeleteImpact: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.AUTHOR_CHECK_DELETE_IMPACT, id),

  // Publisher operations
  createPublisher: (input: PublisherInput) => ipcRenderer.invoke(IPC_CHANNELS.PUBLISHER_CREATE, input),
  updatePublisher: (id: string, input: PublisherInput) => ipcRenderer.invoke(IPC_CHANNELS.PUBLISHER_UPDATE, id, input),
  deletePublisher: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PUBLISHER_DELETE, id),
  getPublisher: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PUBLISHER_GET, id),
  getAllPublishers: () => ipcRenderer.invoke(IPC_CHANNELS.PUBLISHER_GET_ALL),

  // Series operations
  createSeries: (input: SeriesInput) => ipcRenderer.invoke(IPC_CHANNELS.SERIES_CREATE, input),
  updateSeries: (id: string, input: SeriesInput) => ipcRenderer.invoke(IPC_CHANNELS.SERIES_UPDATE, id, input),
  deleteSeries: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SERIES_DELETE, id),
  getSeries: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SERIES_GET, id),
  getAllSeries: () => ipcRenderer.invoke(IPC_CHANNELS.SERIES_GET_ALL),

  // Genre operations
  createGenre: (input: GenreInput) => ipcRenderer.invoke(IPC_CHANNELS.GENRE_CREATE, input),
  updateGenre: (id: string, input: GenreInput) => ipcRenderer.invoke(IPC_CHANNELS.GENRE_UPDATE, id, input),
  deleteGenre: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.GENRE_DELETE, id),
  getGenre: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.GENRE_GET, id),
  getAllGenres: () => ipcRenderer.invoke(IPC_CHANNELS.GENRE_GET_ALL),

  // Topic operations
  createTopic: (input: TopicInput) => ipcRenderer.invoke(IPC_CHANNELS.TOPIC_CREATE, input),
  updateTopic: (id: string, input: TopicInput) => ipcRenderer.invoke(IPC_CHANNELS.TOPIC_UPDATE, id, input),
  deleteTopic: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TOPIC_DELETE, id),
  getTopic: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TOPIC_GET, id),
  getAllTopics: () => ipcRenderer.invoke(IPC_CHANNELS.TOPIC_GET_ALL),

  // Category operations
  createCategory: (input: CategoryInput) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_CREATE, input),
  updateCategory: (id: string, input: CategoryInput) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_UPDATE, id, input),
  deleteCategory: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_DELETE, id),
  getCategory: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_GET, id),
  getAllCategories: () => ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_GET_ALL),

  // Library operations
  getLibraryStats: () => ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_STATS),
  integrityCheck: () => ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_INTEGRITY_CHECK),
  cleanupOrphans: () => ipcRenderer.invoke(IPC_CHANNELS.LIBRARY_CLEANUP_ORPHANS),

  // Import/Export operations
  exportToJson: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.EXPORT_JSON, filePath),
  exportToCsv: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.EXPORT_CSV, filePath),
  importFromJson: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.IMPORT_JSON, filePath),
  selectExportPath: (format: 'json' | 'csv') => ipcRenderer.invoke(IPC_CHANNELS.SELECT_EXPORT_PATH, format),
  selectImportFile: () => ipcRenderer.invoke(IPC_CHANNELS.SELECT_IMPORT_FILE),
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
