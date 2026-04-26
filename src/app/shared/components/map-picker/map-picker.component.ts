import {
  Component, Input, Output, EventEmitter,
  AfterViewInit, OnDestroy, OnChanges, SimpleChanges,
  ElementRef, ViewChild, NgZone, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';

export interface Coordenadas { lat: number; lng: number; }

// Fix icono de Leaflet con Material Icons (evita el bug de webpack con imágenes)
const MARKER_ICON = L.divIcon({
  html: `<span class="material-icons"
               style="color:#E63946;font-size:36px;
                      display:block;margin-left:-12px;margin-top:-36px;
                      filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))">
           location_on
         </span>`,
  iconSize:   [24, 36],
  iconAnchor: [12, 36],
  className:  '',
});

@Component({
  selector: 'app-map-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col gap-3">

      <!-- Búsqueda por dirección -->
      <div class="flex gap-2">
        <input
          [(ngModel)]="busqueda"
          (keydown.enter)="buscarDireccion()"
          type="text"
          placeholder="Buscar dirección o lugar..."
          class="input-field flex-1 text-sm"
        />
        <button type="button" (click)="buscarDireccion()"
                [disabled]="buscando() || !busqueda.trim()"
                class="btn-ghost px-3 flex items-center gap-1 text-sm disabled:opacity-50">
          @if (buscando()) {
            <span class="material-icons text-base animate-spin">sync</span>
          } @else {
            <span class="material-icons text-base">search</span>
          }
        </button>
        <button type="button" (click)="usarGPS()"
                [disabled]="gps()"
                class="btn-ghost px-3 flex items-center gap-1 text-sm disabled:opacity-50"
                title="Usar mi ubicación GPS">
          <span class="material-icons text-base"
                [class.text-success]="coordenadas()">
            {{ gps() ? 'sync' : 'my_location' }}
          </span>
        </button>
      </div>

      @if (sinResultados()) {
        <p class="text-xs text-danger">No se encontró esa dirección. Intenta con otro término.</p>
      }

      <!-- Mapa -->
      <div #mapContainer class="rounded-xl overflow-hidden border border-app-border"
           style="height: 260px; width: 100%;"></div>

      <!-- Coordenadas seleccionadas -->
      @if (coordenadas()) {
        <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-app-elevated
                    border border-app-border text-xs font-mono text-app-muted">
          <span class="material-icons text-sm text-accent">location_on</span>
          {{ coordenadas()!.lat | number:'1.5-5' }},
          {{ coordenadas()!.lng | number:'1.5-5' }}
          <span class="ml-auto text-app-faint">Arrastra el pin para ajustar</span>
        </div>
      } @else {
        <p class="text-xs text-app-faint text-center">
          Haz click en el mapa o busca una dirección para seleccionar la ubicación
        </p>
      }
    </div>
  `,
})
export class MapPickerComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  @Input() lat: number | null = null;
  @Input() lng: number | null = null;
  @Output() coordenadasChange = new EventEmitter<Coordenadas>();

  busqueda    = '';
  buscando    = signal(false);
  gps         = signal(false);
  sinResultados = signal(false);
  coordenadas = signal<Coordenadas | null>(null);

  private map?:    L.Map;
  private marker?: L.Marker;

  // Centro por defecto: Bolivia
  private readonly DEFAULT_LAT = -16.5;
  private readonly DEFAULT_LNG = -64.5;
  private readonly DEFAULT_ZOOM = 6;

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    // Pequeño delay para que el drawer termine su animación antes de inicializar
    setTimeout(() => this.initMap(), 150);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;
    if ((changes['lat'] || changes['lng']) && this.lat && this.lng) {
      this.colocarMarcador(this.lat, this.lng, false);
      this.map.setView([this.lat, this.lng], 14);
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = undefined;
  }

  private initMap(): void {
    if (!this.mapContainer?.nativeElement) return;

    const lat  = this.lat  ?? this.DEFAULT_LAT;
    const lng  = this.lng  ?? this.DEFAULT_LNG;
    const zoom = this.lat  ? 14 : this.DEFAULT_ZOOM;

    this.map = L.map(this.mapContainer.nativeElement, { zoomControl: true })
      .setView([lat, lng], zoom);

    // Tile oscuro (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(this.map);

    if (this.lat && this.lng) {
      this.colocarMarcador(this.lat, this.lng, false);
      this.coordenadas.set({ lat: this.lat, lng: this.lng });
    }

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.zone.run(() => {
        this.colocarMarcador(e.latlng.lat, e.latlng.lng, true);
      });
    });
  }

  private colocarMarcador(lat: number, lng: number, emitir: boolean): void {
    if (!this.map) return;
    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = L.marker([lat, lng], { icon: MARKER_ICON, draggable: true })
        .addTo(this.map);

      this.marker.on('dragend', () => {
        this.zone.run(() => {
          const pos = this.marker!.getLatLng();
          const coords = { lat: pos.lat, lng: pos.lng };
          this.coordenadas.set(coords);
          this.coordenadasChange.emit(coords);
        });
      });
    }

    if (emitir) {
      const coords = { lat, lng };
      this.coordenadas.set(coords);
      this.coordenadasChange.emit(coords);
    }
  }

  buscarDireccion(): void {
    const q = this.busqueda.trim();
    if (!q) return;
    this.buscando.set(true);
    this.sinResultados.set(false);

    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`, {
      headers: { 'Accept-Language': 'es' },
    })
      .then(r => r.json())
      .then((results: { lat: string; lon: string }[]) => {
        this.zone.run(() => {
          this.buscando.set(false);
          if (!results.length) { this.sinResultados.set(true); return; }
          const lat = parseFloat(results[0].lat);
          const lng = parseFloat(results[0].lon);
          this.map?.setView([lat, lng], 15);
          this.colocarMarcador(lat, lng, true);
        });
      })
      .catch(() => this.zone.run(() => {
        this.buscando.set(false);
        this.sinResultados.set(true);
      }));
  }

  usarGPS(): void {
    if (!navigator.geolocation) return;
    this.gps.set(true);
    navigator.geolocation.getCurrentPosition(
      pos => this.zone.run(() => {
        const { latitude: lat, longitude: lng } = pos.coords;
        this.map?.setView([lat, lng], 16);
        this.colocarMarcador(lat, lng, true);
        this.gps.set(false);
      }),
      () => this.zone.run(() => this.gps.set(false)),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }
}
