import { Component, effect, input, signal } from '@angular/core';
import { DestinationImageService, DestinationImage } from '../../services/destination-image.service';
import { extractDestination, extractDestinationFromAnswer } from '../../utils/extract-destination';

@Component({
  selector: 'app-destination-hero',
  standalone: true,
  imports: [],
  templateUrl: './destination-hero.component.html',
  styleUrl: './destination-hero.component.css',
})
export class DestinationHeroComponent {
  query = input.required<string>();
  /** Once the agents finish, pass the final answer so we can try to read
   *  its destination straight from the LLM's own text. */
  answer = input<string | null>(null);

  place = signal<string>('Your trip');
  image = signal<DestinationImage | null>(null);
  loading = signal(true);

  constructor(private imageService: DestinationImageService) {
    effect(() => {
      const query = this.query();
      const answer = this.answer();

      // Try, in order of reliability:
      // 1. An explicit "Destination: X" line in the answer, if the model wrote one.
      // 2. The same "in X" / "to X" heuristic, run on the answer itself — the LLM's
      //    own prose almost always capitalizes place names correctly even when it
      //    doesn't follow the exact "Destination:" formatting instruction.
      // 3. The same heuristic run on the raw user query, as a placeholder while loading.
      const fromAnswerLine = answer ? extractDestinationFromAnswer(answer) : null;
      const fromAnswerText = !fromAnswerLine && answer ? extractDestination(answer.slice(0, 400)) : null;
      const fromQuery = extractDestination(query);

      const searchTerm = fromAnswerLine?.searchTerm ?? fromAnswerText ?? fromQuery;
      const displayName = fromAnswerLine?.display ?? fromAnswerText ?? fromQuery ?? 'Your trip';

      this.loading.set(true);
      this.image.set(null);
      this.place.set(displayName);

      if (!searchTerm) {
        this.loading.set(false);
        return;
      }

      this.imageService.fetch(searchTerm).subscribe((result) => {
        this.image.set(result);
        this.loading.set(false);
      });
    }, { allowSignalWrites: true });
  }
}