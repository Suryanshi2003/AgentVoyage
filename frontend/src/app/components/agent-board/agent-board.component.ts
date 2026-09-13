import { Component, input } from '@angular/core';

export type AgentStatus = 'pending' | 'active' | 'done';

export interface AgentStage {
  code: string;
  name: string;
  status: AgentStatus;
}

@Component({
  selector: 'app-agent-board',
  standalone: true,
  imports: [],
  templateUrl: './agent-board.component.html',
  styleUrl: './agent-board.component.css',
})
export class AgentBoardComponent {
  stages = input.required<AgentStage[]>();

  statusLabel(status: AgentStatus): string {
    switch (status) {
      case 'pending':
        return 'WAITING';
      case 'active':
        return 'SEARCHING';
      case 'done':
        return 'CONFIRMED';
    }
  }
}
