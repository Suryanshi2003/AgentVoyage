import { Component, signal } from '@angular/core';
import { HeroSearchComponent } from './components/hero-search/hero-search.component';
import { AgentBoardComponent, AgentStage } from './components/agent-board/agent-board.component';
import { ResultTicketsComponent } from './components/result-tickets/result-tickets.component';
import { DestinationHeroComponent } from './components/destination-hero/destination-hero.component';
import { TravelApiService } from './services/travel-api.service';
import { PlanResponse } from './models/trip.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HeroSearchComponent, AgentBoardComponent, ResultTicketsComponent, DestinationHeroComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  loading = signal(false);
  error = signal<string | null>(null);
  result = signal<PlanResponse | null>(null);
  lastQuery = signal('');

  private threadId: string | null = null;
  private progressTimer?: ReturnType<typeof setInterval>;

  stages = signal<AgentStage[]>([
    { code: 'FL', name: 'Flight Agent', status: 'pending' },
    { code: 'HT', name: 'Hotel Agent', status: 'pending' },
    { code: 'IT', name: 'Itinerary Agent', status: 'pending' },
    { code: 'FN', name: 'Final Agent', status: 'pending' },
  ]);

  constructor(private api: TravelApiService) {}

  onSearch(query: string) {
    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);
    this.lastQuery.set(query);
    this.resetStages();
    this.simulateProgress();

    this.api.planTrip({ message: query, thread_id: this.threadId ?? undefined }).subscribe({
      next: (res) => {
        this.finishProgress();
        this.threadId = res.thread_id;
        this.result.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        clearInterval(this.progressTimer);
        const message =
          err instanceof Error
            ? err.message
            : 'The agents hit turbulence reaching the backend. Confirm your server is running.';
        this.error.set(message);
        this.loading.set(false);
        this.resetStages();
      },
    });
  }

  private resetStages() {
    this.stages.update((stages) => stages.map((s) => ({ ...s, status: 'pending' as const })));
  }

  /** Advances the board one gate at a time while we wait on the real backend call. */
  private simulateProgress() {
    let index = 0;
    this.stages.update((stages) =>
      stages.map((s, i) => (i === 0 ? { ...s, status: 'active' as const } : s))
    );

    this.progressTimer = setInterval(() => {
      this.stages.update((stages) => {
        const next = stages.map((s) => ({ ...s }));
        if (index < next.length) {
          next[index].status = 'done';
          index++;
          if (index < next.length) next[index].status = 'active';
        }
        return next;
      });
      if (index >= this.stages().length) clearInterval(this.progressTimer);
    }, 1400);
  }

  private finishProgress() {
    clearInterval(this.progressTimer);
    this.stages.update((stages) => stages.map((s) => ({ ...s, status: 'done' as const })));
  }
}
