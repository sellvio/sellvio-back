import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class StripEmptyPipe implements PipeTransform {
  transform(value: any, _metadata: ArgumentMetadata) {
    return this.sanitize(value);
  }

  private sanitize(input: any): any {
    if (input === null || input === undefined) {
      return undefined;
    }
    if (typeof input === 'string') {
      const trimmed = input.trim();
      return trimmed === '' ? undefined : input;
    }
    if (Array.isArray(input)) {
      const mapped = input
        .map((v) => this.sanitize(v))
        .filter((v) => v !== undefined);
      return mapped.length === 0 ? undefined : mapped;
    }
    if (typeof input === 'object') {
      // Do not alter Date instances
      if (input instanceof Date) return input;
      const result: any = {};
      for (const [key, val] of Object.entries(input)) {
        // Special handling: allow clear_fields to be provided as string
        if (key === 'clear_fields' && typeof val === 'string') {
          const normalized = this.normalizeClearFields(val as string);
          if (normalized.length > 0) {
            result[key] = normalized;
          }
          continue;
        }
        const cleaned = this.sanitize(val);
        if (cleaned !== undefined) {
          result[key] = cleaned;
        }
      }
      return Object.keys(result).length === 0 ? undefined : result;
    }
    return input;
  }

  private normalizeClearFields(value: string): string[] {
    const trimmed = value.trim();
    if (trimmed === '') return [];
    // Try JSON parse first (e.g., '["a","b"]')
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((v) => (typeof v === 'string' ? v.trim() : String(v)))
          .filter((v) => v.length > 0);
      }
    } catch {
      // fallthrough to CSV parsing
    }
    // Fallback: comma-separated string
    return trimmed
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
}
