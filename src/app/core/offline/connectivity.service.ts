import { Injectable, signal } from '@angular/core';

/**
 * Estado de conexión del navegador. Usa `navigator.onLine` + los eventos
 * `online` / `offline`. Otros componentes/servicios pueden leer `enLinea()`
 * como signal para reaccionar en tiempo real.
 *
 * Nota: `navigator.onLine` es heurístico. Cuando vuelve a estar `true`,
 * conviene revalidar contra el backend antes de hacer una escritura
 * crítica.
 */
@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly _enLinea = signal<boolean>(this.estadoInicial());
  readonly enLinea = this._enLinea.asReadonly();

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('online',  () => this._enLinea.set(true));
    window.addEventListener('offline', () => this._enLinea.set(false));
  }

  private estadoInicial(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
  }
}
