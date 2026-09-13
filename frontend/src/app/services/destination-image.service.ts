import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

export interface DestinationImage {
  title: string;
  extract: string;
  imageUrl: string | null;
  pageUrl: string | null;
}

interface WikiSummaryResponse {
  title: string;
  extract: string;
  thumbnail?: { source: string };
  originalimage?: { source: string };
  content_urls?: { desktop?: { page: string } };
}

@Injectable({ providedIn: 'root' })
export class DestinationImageService {
  private readonly baseUrl = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

  constructor(private http: HttpClient) {}

  /**
   * Uses Wikipedia's public REST summary endpoint — no API key needed,
   * CORS-enabled. Returns null (rather than erroring) if the place isn't
   * found, so the UI can fall back to a plain gradient hero.
   */
  fetch(place: string): Observable<DestinationImage | null> {
    if (!place?.trim()) return of(null);

    const url = `${this.baseUrl}${encodeURIComponent(place.trim())}`;
    return this.http.get<WikiSummaryResponse>(url).pipe(
      map((res) => ({
        title: res.title,
        extract: res.extract,
        imageUrl: res.originalimage?.source ?? res.thumbnail?.source ?? null,
        pageUrl: res.content_urls?.desktop?.page ?? null,
      })),
      catchError(() => of(null))
    );
  }
}
