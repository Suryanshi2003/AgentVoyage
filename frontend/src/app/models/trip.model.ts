export interface PlanRequest {
  message: string;
  thread_id?: string;
}

/** Mirrors the dict returned by run_travel_agent() in backend.py */
export interface PlanResponse {
  thread_id: string;
  answer: string;
  flight_results: string;
  hotel_results: string;
  itinerary: string;
  llm_calls: number;
}

/** Raw shape returned by POST /api/travel, which wraps PlanResponse in a success flag */
export interface RawTravelResponse extends Partial<PlanResponse> {
  success: boolean;
  error?: string;
}
