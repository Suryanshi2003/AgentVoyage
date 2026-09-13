import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { PlanRequest, PlanResponse, RawTravelResponse } from '../models/trip.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TravelApiService {
  /** Matches the POST /api/travel route in app.py */
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  planTrip(payload: PlanRequest): Observable<PlanResponse> {
    return this.http.post<RawTravelResponse>(this.apiUrl, payload).pipe(
      map((raw) => {
        if (!raw.success) {
          throw new Error(raw.error || 'The travel agents could not complete this request.');
        }
        const { success, error, ...rest } = raw;
        return rest as PlanResponse;
      })
    );
  }
}
