import fs from 'fs';
import { transaction } from '../database/connection';
import { bookRepository } from '../repositories/bookRepository';
import { authorRepository } from '../repositories/authorRepository';
import { publisherRepository } from '../repositories/publisherRepository';
import { seriesRepository } from '../repositories/seriesRepository';
import { genreRepository } from '../repositories/genreRepository';
import { topicRepository } from '../repositories/topicRepository';
import { categoryRepository } from '../repositories/categoryRepository';
import { domainService } from './domainService';
import type { ExportData, ImportResult } from '../../src/shared/types';

export class ImportExportService {
  exportToJson(filePath: string): void {

    // Get all data
    const books = bookRepository.findAll();
    const authors = authorRepository.findAll();
    const publishers = publisherRepository.findAll();
    const series = seriesRepository.findAll();
    const genres = genreRepository.findAll();
    const topics = topicRepository.findAll();
    const categories = categoryRepository.findAll();

    const exportData: ExportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      books,
      authors,
      publishers,
      series,
      genres,
      topics,
      categories,
    };

    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf-8');
  }

  exportToCsv(filePath: string): void {
    const books = bookRepository.findAll();

    const headers = [
      'Title',
      'Authors',
      'Publisher',
      'ISBN',
      'Publication Year',
      'Pages',
      'Series',
      'Series Order',
      'Category',
      'Genres',
      'Topics',
      'Reading Status',
      'Rating',
      'Notes',
      'Description',
    ];

    const rows = books.map(book => [
      this.escapeCsvField(book.title),
      this.escapeCsvField(book.authors.map(a => a.name).join('; ')),
      this.escapeCsvField(book.publisher?.name || ''),
      this.escapeCsvField(book.isbn || ''),
      book.publicationYear?.toString() || '',
      book.pages?.toString() || '',
      this.escapeCsvField(book.series?.name || ''),
      book.seriesOrder?.toString() || '',
      this.escapeCsvField(book.category?.name || ''),
      this.escapeCsvField(book.genres.map(g => g.name).join('; ')),
      this.escapeCsvField(book.topics.map(t => t.name).join('; ')),
      book.readingStatus,
      book.rating?.toString() || '',
      this.escapeCsvField(book.notes || ''),
      this.escapeCsvField(book.description || ''),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    fs.writeFileSync(filePath, csv, 'utf-8');
  }

  importFromJson(filePath: string): ImportResult {
    const result: ImportResult = {
      success: false,
      booksImported: 0,
      authorsImported: 0,
      publishersImported: 0,
      seriesImported: 0,
      genresImported: 0,
      topicsImported: 0,
      categoriesImported: 0,
      errors: [],
    };

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent) as ExportData;

      if (!data.version) {
        result.errors.push('Invalid export file: missing version');
        return result;
      }

      transaction(() => {
        // Import categories first (books depend on them)
        for (const category of data.categories || []) {
          try {
            const existing = categoryRepository.findById(category.id);
            if (!existing) {
              categoryRepository.create({
                id: category.id,
                name: category.name,
                description: category.description,
                color: category.color,
              });
              result.categoriesImported++;
            }
          } catch (error: any) {
            result.errors.push(`Failed to import category "${category.name}": ${error.message}`);
          }
        }

        // Import authors
        for (const author of data.authors || []) {
          try {
            const existing = authorRepository.findById(author.id);
            if (!existing) {
              authorRepository.create({
                id: author.id,
                name: author.name,
                bio: author.bio,
              });
              result.authorsImported++;
            }
          } catch (error: any) {
            result.errors.push(`Failed to import author "${author.name}": ${error.message}`);
          }
        }

        // Import publishers
        for (const publisher of data.publishers || []) {
          try {
            const existing = publisherRepository.findById(publisher.id);
            if (!existing) {
              publisherRepository.create({
                id: publisher.id,
                name: publisher.name,
                location: publisher.location,
                website: publisher.website,
              });
              result.publishersImported++;
            }
          } catch (error: any) {
            result.errors.push(`Failed to import publisher "${publisher.name}": ${error.message}`);
          }
        }

        // Import genres
        for (const genre of data.genres || []) {
          try {
            const existing = genreRepository.findById(genre.id);
            if (!existing) {
              genreRepository.create({
                id: genre.id,
                name: genre.name,
                description: genre.description,
              });
              result.genresImported++;
            }
          } catch (error: any) {
            result.errors.push(`Failed to import genre "${genre.name}": ${error.message}`);
          }
        }

        // Import topics
        for (const topic of data.topics || []) {
          try {
            const existing = topicRepository.findById(topic.id);
            if (!existing) {
              topicRepository.create({
                id: topic.id,
                name: topic.name,
                description: topic.description,
              });
              result.topicsImported++;
            }
          } catch (error: any) {
            result.errors.push(`Failed to import topic "${topic.name}": ${error.message}`);
          }
        }

        // Import series (must have authors)
        for (const series of data.series || []) {
          try {
            const existing = seriesRepository.findById(series.id);
            if (!existing) {
              const authorIds = series.authors?.map(a => a.id) || [];
              if (authorIds.length > 0) {
                seriesRepository.create({
                  id: series.id,
                  name: series.name,
                  description: series.description,
                  authorIds,
                });
                result.seriesImported++;
              }
            }
          } catch (error: any) {
            result.errors.push(`Failed to import series "${series.name}": ${error.message}`);
          }
        }

        // Import books
        for (const book of data.books || []) {
          try {
            const existing = bookRepository.findById(book.id);
            if (!existing) {
              bookRepository.create({
                id: book.id,
                title: book.title,
                isbn: book.isbn,
                publicationYear: book.publicationYear,
                pages: book.pages,
                description: book.description,
                coverImage: book.coverImage,
                readingStatus: book.readingStatus,
                notes: book.notes,
                rating: book.rating,
                publisherId: book.publisherId,
                seriesId: book.seriesId,
                seriesOrder: book.seriesOrder,
                categoryId: book.categoryId,
                authorIds: book.authors?.map(a => a.id) || [],
                genreIds: book.genres?.map(g => g.id) || [],
                topicIds: book.topics?.map(t => t.id) || [],
              });
              result.booksImported++;
            }
          } catch (error: any) {
            result.errors.push(`Failed to import book "${book.title}": ${error.message}`);
          }
        }

        // After import, clean up any orphan entities that might have been created
        // This handles edge cases where authors/publishers were imported but their books failed
        const cleanup = domainService.cleanupOrphans();
        if (cleanup.deletedAuthors.length > 0) {
          result.errors.push(`Cleaned up ${cleanup.deletedAuthors.length} orphan author(s) without books`);
        }
        if (cleanup.deletedPublishers.length > 0) {
          result.errors.push(`Cleaned up ${cleanup.deletedPublishers.length} orphan publisher(s) without books`);
        }
        if (cleanup.deletedSeries.length > 0) {
          result.errors.push(`Cleaned up ${cleanup.deletedSeries.length} orphan series without books`);
        }
      });

      result.success = result.errors.length === 0;
    } catch (error: any) {
      result.errors.push(`Failed to parse import file: ${error.message}`);
    }

    return result;
  }

  private escapeCsvField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}

export const importExportService = new ImportExportService();
