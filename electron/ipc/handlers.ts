import { ipcMain, dialog, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../src/shared/ipc';
import {
  BookSchema,
  AuthorSchema,
  PublisherSchema,
  SeriesSchema,
  GenreSchema,
  TopicSchema,
  CategorySchema,
  BookSearchParamsSchema,
  ReadingProgressUpdateSchema,
} from '../../src/shared/types';
import { bookRepository } from '../repositories/bookRepository';
import { authorRepository } from '../repositories/authorRepository';
import { publisherRepository } from '../repositories/publisherRepository';
import { seriesRepository } from '../repositories/seriesRepository';
import { genreRepository } from '../repositories/genreRepository';
import { topicRepository } from '../repositories/topicRepository';
import { categoryRepository } from '../repositories/categoryRepository';
import { libraryService } from '../services/libraryService';
import { importExportService } from '../services/importExportService';
import { domainService } from '../services/domainService';

function handleError(error: unknown): never {
  if (error instanceof Error) {
    throw new Error(error.message);
  }
  throw new Error('An unknown error occurred');
}

export function registerIpcHandlers(): void {
  // ============================================================================
  // Book Handlers
  // ============================================================================

  ipcMain.handle(IPC_CHANNELS.BOOK_CREATE, async (_event, input) => {
    try {
      const validated = BookSchema.parse(input);
      return bookRepository.create(validated);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.BOOK_UPDATE, async (_event, id: string, input, options?: { cleanupOrphans?: boolean }) => {
    try {
      const validated = BookSchema.parse(input);
      return bookRepository.update(id, validated, options);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.BOOK_DELETE, async (_event, id: string, options?: { cleanupOrphans?: boolean }) => {
    try {
      return bookRepository.delete(id, options);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.BOOK_CHECK_DELETE_IMPACT, async (_event, id: string) => {
    try {
      return bookRepository.checkDeleteImpact(id);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.BOOK_CHECK_UPDATE_IMPACT, async (_event, id: string, input) => {
    try {
      const validated = BookSchema.parse(input);
      return bookRepository.checkUpdateImpact(id, validated);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.BOOK_GET, async (_event, id: string) => {
    try {
      return bookRepository.findByIdWithRelations(id);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.BOOK_GET_ALL, async () => {
    try {
      return bookRepository.findAll();
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.BOOK_SEARCH, async (_event, params) => {
    try {
      const validated = BookSearchParamsSchema.parse(params);
      return bookRepository.search(validated);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.BOOK_UPDATE_PROGRESS, async (_event, update) => {
    try {
      const validated = ReadingProgressUpdateSchema.parse(update);
      return bookRepository.updateReadingProgress(validated);
    } catch (error) {
      handleError(error);
    }
  });

  // ============================================================================
  // Author Handlers
  // ============================================================================

  ipcMain.handle(IPC_CHANNELS.AUTHOR_CREATE, async (_event, input) => {
    try {
      const validated = AuthorSchema.parse(input);
      return authorRepository.create(validated);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTHOR_UPDATE, async (_event, id: string, input) => {
    try {
      const validated = AuthorSchema.parse(input);
      return authorRepository.update(id, validated);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTHOR_DELETE, async (_event, id: string) => {
    try {
      return authorRepository.delete(id);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTHOR_GET, async (_event, id: string) => {
    try {
      return authorRepository.findByIdWithStats(id);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTHOR_GET_ALL, async () => {
    try {
      return authorRepository.findAll();
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTHOR_CHECK_DELETE_IMPACT, async (_event, id: string) => {
    try {
      return domainService.checkAuthorDeleteImpact(id);
    } catch (error) {
      handleError(error);
    }
  });

  // ============================================================================
  // Publisher Handlers
  // ============================================================================

  ipcMain.handle(IPC_CHANNELS.PUBLISHER_CREATE, async (_event, input) => {
    try {
      const validated = PublisherSchema.parse(input);
      return publisherRepository.create(validated);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PUBLISHER_UPDATE, async (_event, id: string, input) => {
    try {
      const validated = PublisherSchema.parse(input);
      return publisherRepository.update(id, validated);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PUBLISHER_DELETE, async (_event, id: string) => {
    try {
      return publisherRepository.delete(id);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PUBLISHER_GET, async (_event, id: string) => {
    try {
      return publisherRepository.findByIdWithStats(id);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PUBLISHER_GET_ALL, async () => {
    try {
      return publisherRepository.findAll();
    } catch (error) {
      handleError(error);
    }
  });

  // ============================================================================
  // Series Handlers
  // ============================================================================

  ipcMain.handle(IPC_CHANNELS.SERIES_CREATE, async (_event, input) => {
    try {
      const validated = SeriesSchema.parse(input);
      return seriesRepository.create(validated);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SERIES_UPDATE, async (_event, id: string, input) => {
    try {
      const validated = SeriesSchema.parse(input);
      return seriesRepository.update(id, validated);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SERIES_DELETE, async (_event, id: string) => {
    try {
      return seriesRepository.delete(id);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SERIES_GET, async (_event, id: string) => {
    try {
      return seriesRepository.findByIdWithAuthors(id);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SERIES_GET_ALL, async () => {
    try {
      return seriesRepository.findAll();
    } catch (error) {
      handleError(error);
    }
  });

  // ============================================================================
  // Genre Handlers
  // ============================================================================

  ipcMain.handle(IPC_CHANNELS.GENRE_CREATE, async (_event, input) => {
    try {
      const validated = GenreSchema.parse(input);
      return genreRepository.create(validated);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GENRE_UPDATE, async (_event, id: string, input) => {
    try {
      const validated = GenreSchema.parse(input);
      return genreRepository.update(id, validated);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GENRE_DELETE, async (_event, id: string) => {
    try {
      return genreRepository.delete(id);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GENRE_GET, async (_event, id: string) => {
    try {
      return genreRepository.findByIdWithStats(id);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.GENRE_GET_ALL, async () => {
    try {
      return genreRepository.findAll();
    } catch (error) {
      handleError(error);
    }
  });

  // ============================================================================
  // Topic Handlers
  // ============================================================================

  ipcMain.handle(IPC_CHANNELS.TOPIC_CREATE, async (_event, input) => {
    try {
      const validated = TopicSchema.parse(input);
      return topicRepository.create(validated);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.TOPIC_UPDATE, async (_event, id: string, input) => {
    try {
      const validated = TopicSchema.parse(input);
      return topicRepository.update(id, validated);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.TOPIC_DELETE, async (_event, id: string) => {
    try {
      return topicRepository.delete(id);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.TOPIC_GET, async (_event, id: string) => {
    try {
      return topicRepository.findByIdWithStats(id);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.TOPIC_GET_ALL, async () => {
    try {
      return topicRepository.findAll();
    } catch (error) {
      handleError(error);
    }
  });

  // ============================================================================
  // Category Handlers
  // ============================================================================

  ipcMain.handle(IPC_CHANNELS.CATEGORY_CREATE, async (_event, input) => {
    try {
      const validated = CategorySchema.parse(input);
      return categoryRepository.create(validated);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.CATEGORY_UPDATE, async (_event, id: string, input) => {
    try {
      const validated = CategorySchema.parse(input);
      return categoryRepository.update(id, validated);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.CATEGORY_DELETE, async (_event, id: string) => {
    try {
      return categoryRepository.delete(id);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.CATEGORY_GET, async (_event, id: string) => {
    try {
      return categoryRepository.findByIdWithStats(id);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.CATEGORY_GET_ALL, async () => {
    try {
      return categoryRepository.findAll();
    } catch (error) {
      handleError(error);
    }
  });

  // ============================================================================
  // Library Handlers
  // ============================================================================

  ipcMain.handle(IPC_CHANNELS.LIBRARY_STATS, async () => {
    try {
      return libraryService.getStats();
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.LIBRARY_INTEGRITY_CHECK, async () => {
    try {
      return domainService.integrityCheck();
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.LIBRARY_CLEANUP_ORPHANS, async () => {
    try {
      return domainService.cleanupOrphans();
    } catch (error) {
      handleError(error);
    }
  });

  // ============================================================================
  // Import/Export Handlers
  // ============================================================================

  ipcMain.handle(IPC_CHANNELS.EXPORT_JSON, async (_event, filePath: string) => {
    try {
      return importExportService.exportToJson(filePath);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.EXPORT_CSV, async (_event, filePath: string) => {
    try {
      return importExportService.exportToCsv(filePath);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.IMPORT_JSON, async (_event, filePath: string) => {
    try {
      return importExportService.importFromJson(filePath);
    } catch (error) {
      handleError(error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SELECT_EXPORT_PATH, async (_event, format: 'json' | 'csv') => {
    const window = BrowserWindow.getFocusedWindow();
    if (!window) return null;

    const result = await dialog.showSaveDialog(window, {
      title: `Export Library as ${format.toUpperCase()}`,
      defaultPath: `library-export-${new Date().toISOString().split('T')[0]}.${format}`,
      filters: [
        format === 'json'
          ? { name: 'JSON Files', extensions: ['json'] }
          : { name: 'CSV Files', extensions: ['csv'] },
      ],
    });

    return result.canceled ? null : result.filePath;
  });

  ipcMain.handle(IPC_CHANNELS.SELECT_IMPORT_FILE, async () => {
    const window = BrowserWindow.getFocusedWindow();
    if (!window) return null;

    const result = await dialog.showOpenDialog(window, {
      title: 'Import Library from JSON',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile'],
    });

    return result.canceled ? null : result.filePaths[0];
  });

  console.log('All IPC handlers registered');
}
