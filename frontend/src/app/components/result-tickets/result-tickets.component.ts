import { Component, computed, input, signal } from '@angular/core';
import { jsPDF } from 'jspdf';
import { IconComponent } from '../icon/icon.component';
import { MarkdownPipe } from '../../pipes/markdown.pipe';
import { PlanResponse } from '../../models/trip.model';
import {
  ItineraryDay,
  SummarySection,
  extractProviderNote,
  parseItineraryDays,
  parseSummarySections,
  toPlainText,
} from '../../utils/parse-content';

type TabKey = 'summary' | 'flights' | 'hotels' | 'itinerary';

interface Tab {
  key: TabKey;
  label: string;
  gate: string;
}

@Component({
  selector: 'app-result-tickets',
  standalone: true,
  imports: [IconComponent, MarkdownPipe],
  templateUrl: './result-tickets.component.html',
  styleUrl: './result-tickets.component.css',
})
export class ResultTicketsComponent {
  result = input.required<PlanResponse>();

  readonly tabs: Tab[] = [
    { key: 'summary', label: 'Summary', gate: 'A1' },
    { key: 'flights', label: 'Flights', gate: 'A2' },
    { key: 'hotels', label: 'Hotels', gate: 'A3' },
    { key: 'itinerary', label: 'Itinerary', gate: 'A4' },
  ];

  activeTab = signal<TabKey>('summary');
  copied = signal(false);

  activeTabInfo = computed(() => this.tabs.find((t) => t.key === this.activeTab()) ?? this.tabs[0]);

  /** Raw markdown for the active tab, with API/provider mentions stripped out. */
  private cleaned = computed(() => {
    const r = this.result();
    const raw =
        this.activeTab() === 'flights'
            ? r.flight_results
            : this.activeTab() === 'hotels'
                ? r.hotel_results
                : this.activeTab() === 'itinerary'
                    ? r.itinerary
                    : r.answer;
    return extractProviderNote(raw);
  });

  /** Plain-language stand-in for any technical caveat that was filtered out. */
  providerNote = computed(() => this.cleaned().note);

  /**
   * Icon-labeled cards for the Summary tab. Flights, Hotels and Itinerary
   * already have their own tabs, so this only keeps the sections that
   * don't duplicate them — trip overview, budget, recommendations.
   */
  summarySections = computed<SummarySection[] | null>(() => {
    if (this.activeTab() !== 'summary') return null;
    const sections = parseSummarySections(this.cleaned().content);
    if (!sections) return null;
    const overview = sections.filter((s) => !/flight|hotel|itinerary/i.test(s.title));
    return overview.length ? overview : sections;
  });

  /** Day-by-day timeline for the Itinerary tab, when "Day N" markers are present. */
  itineraryDays = computed<ItineraryDay[] | null>(() =>
      this.activeTab() === 'itinerary' ? parseItineraryDays(this.cleaned().content) : null
  );

  /** Full markdown body, rendered via the markdown pipe, for tabs without special layout. */
  fallbackBody = computed(() => this.cleaned().content);

  setTab(key: TabKey) {
    this.activeTab.set(key);
  }

  async copyPlan() {
    const text = toPlainText(this.result().answer);
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1800);
    } catch {
      // Clipboard permission denied or unavailable — fail quietly, button just won't confirm.
    }
  }

  downloadPdf() {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 48;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - margin * 2;
    const lineHeight = 15;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Your AI Travel Plan', margin, margin);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Thread ID: ${this.result().thread_id}`, margin, margin + 18);

    doc.setFontSize(11);
    const lines = doc.splitTextToSize(toPlainText(this.result().answer), maxWidth);

    let y = margin + 44;
    for (const line of lines) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }

    doc.save('agentvoyage-trip-plan.pdf');
  }
}