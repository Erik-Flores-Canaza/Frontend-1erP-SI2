import {
  Component, forwardRef, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

interface Country {
  code: string;
  name: string;
  dial: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: 'BO', name: 'Bolivia',    dial: '+591', flag: '🇧🇴' },
  { code: 'AR', name: 'Argentina',  dial: '+54',  flag: '🇦🇷' },
  { code: 'BR', name: 'Brasil',     dial: '+55',  flag: '🇧🇷' },
  { code: 'CL', name: 'Chile',      dial: '+56',  flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia',   dial: '+57',  flag: '🇨🇴' },
  { code: 'EC', name: 'Ecuador',    dial: '+593', flag: '🇪🇨' },
  { code: 'MX', name: 'México',     dial: '+52',  flag: '🇲🇽' },
  { code: 'PE', name: 'Perú',       dial: '+51',  flag: '🇵🇪' },
  { code: 'PY', name: 'Paraguay',   dial: '+595', flag: '🇵🇾' },
  { code: 'UY', name: 'Uruguay',    dial: '+598', flag: '🇺🇾' },
  { code: 'VE', name: 'Venezuela',  dial: '+58',  flag: '🇻🇪' },
  { code: 'ES', name: 'España',     dial: '+34',  flag: '🇪🇸' },
  { code: 'US', name: 'EE.UU.',     dial: '+1',   flag: '🇺🇸' },
];

@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="flex gap-0 rounded-lg border border-app-border bg-app-card overflow-hidden
                focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/30
                transition-all">

      <!-- Selector de país -->
      <div class="relative flex-shrink-0">
        <select
          [ngModel]="selectedCode()"
          (ngModelChange)="onCountryChange($event)"
          (blur)="onTouched()"
          class="h-full appearance-none bg-app-elevated text-app-text text-sm font-medium
                 pl-3 pr-7 border-r border-app-border cursor-pointer
                 focus:outline-none"
        >
          @for (c of countries; track c.code) {
            <option [value]="c.code">{{ c.flag }} {{ c.dial }}</option>
          }
        </select>
        <!-- Chevron custom -->
        <span class="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2
                     material-icons text-app-faint text-base">
          expand_more
        </span>
      </div>

      <!-- Número local -->
      <input
        type="tel"
        [ngModel]="localNumber()"
        (ngModelChange)="onNumberChange($event)"
        (blur)="onTouched()"
        [placeholder]="placeholder()"
        class="flex-1 bg-transparent px-3 py-2 text-sm text-app-text
               placeholder:text-app-faint focus:outline-none"
      />
    </div>
  `,
})
export class PhoneInputComponent implements ControlValueAccessor {
  readonly countries = COUNTRIES;

  selectedCode = signal('BO');
  localNumber  = signal('');

  placeholder = computed(() => {
    const c = COUNTRIES.find(x => x.code === this.selectedCode());
    return c?.code === 'BO' ? '72 000 000' : '000 000 000';
  });

  private _onChange: (v: string | null) => void = () => {};
  onTouched: () => void = () => {};

  // ControlValueAccessor ────────────────────────────────────────────────────

  writeValue(value: string | null): void {
    if (!value) {
      this.selectedCode.set('BO');
      this.localNumber.set('');
      return;
    }
    // Intenta hacer match con el prefijo más largo primero para evitar
    // que "+591" matchee con "+59" (Ecuador sin h)
    const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
    const match  = sorted.find(c => value.startsWith(c.dial));
    if (match) {
      this.selectedCode.set(match.code);
      this.localNumber.set(value.slice(match.dial.length).trim());
    } else {
      this.localNumber.set(value);
    }
  }

  registerOnChange(fn: (v: string | null) => void): void { this._onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }

  // ── Handlers ──────────────────────────────────────────────────────────────

  onCountryChange(code: string): void {
    this.selectedCode.set(code);
    this._emit();
  }

  onNumberChange(val: string): void {
    this.localNumber.set(val);
    this._emit();
  }

  private _emit(): void {
    const num = this.localNumber().trim();
    const country = COUNTRIES.find(c => c.code === this.selectedCode())!;
    this._onChange(num ? `${country.dial} ${num}` : null);
  }
}
