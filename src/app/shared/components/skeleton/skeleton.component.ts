import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="skeleton"
      [style.height]="height"
      [style.width]="width"
      [style.border-radius]="radius"
    ></div>
  `,
})
export class SkeletonComponent {
  @Input() height = '1rem';
  @Input() width  = '100%';
  @Input() radius = '6px';
}
