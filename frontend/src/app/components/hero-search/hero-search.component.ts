import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-hero-search',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './hero-search.component.html',
  styleUrl: './hero-search.component.css',
})
export class HeroSearchComponent {
  loading = input<boolean>(false);
  submitQuery = output<string>();

  query = signal('');

  readonly examples = [
    '5 days in Kyoto in March, mid-range budget',
    'Weekend in Lisbon for two, love good food',
    '10-day backpacking trip through Vietnam',
  ];

  useExample(example: string) {
    this.query.set(example);
  }

  onSubmit() {
    const value = this.query().trim();
    if (!value || this.loading()) return;
    this.submitQuery.emit(value);
  }
}
