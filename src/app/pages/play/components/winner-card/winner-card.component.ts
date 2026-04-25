import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-winner-card',
  standalone: true,
  templateUrl: './winner-card.component.html',
  styleUrl: './winner-card.component.css',
})
export class WinnerCardComponent {
  @Input({ required: true }) winnerName = '';
  @Input() disabled = false;

  @Output() downloadHistory = new EventEmitter<void>();
  @Output() emailHistory = new EventEmitter<void>();
  @Output() newGame = new EventEmitter<void>();
}

