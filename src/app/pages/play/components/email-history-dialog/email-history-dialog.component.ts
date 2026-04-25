import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-email-history-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './email-history-dialog.component.html',
  styleUrl: './email-history-dialog.component.css',
})
export class EmailHistoryDialogComponent {
  @Input() open = false;
  @Output() close = new EventEmitter<void>();
  @Output() submitEmail = new EventEmitter<string>();

  emailTo = '';

  openDialog(): void {
    this.emailTo = '';
  }

  requestClose(): void {
    this.close.emit();
  }

  submit(): void {
    const to = this.emailTo.trim();
    if (to.length === 0) return;
    this.submitEmail.emit(to);
  }
}

