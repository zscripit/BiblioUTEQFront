import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrestamosService } from '../../prestamos/prestamos.service';

@Component({
  selector: 'app-historial-devoluciones',
  imports: [FormsModule],
  templateUrl: './historial-devoluciones.html',
  styleUrl: './historial-devoluciones.scss',
})
export class HistorialDevoluciones {
  private readonly prestamosService = inject(PrestamosService);

  protected readonly usuarios = this.prestamosService.usuarios;
  protected readonly libros = this.prestamosService.libros;

  protected readonly usuarioId = signal('');
  protected readonly libroId = signal('');
  protected readonly desde = signal('');
  protected readonly hasta = signal('');

  protected readonly devoluciones = computed(() =>
    this.prestamosService.historialDevolucionesFiltrado({
      usuarioId: this.usuarioId() || undefined,
      libroId: this.libroId() || undefined,
      desde: this.desde() || undefined,
      hasta: this.hasta() || undefined,
    }),
  );

  limpiarFiltros(): void {
    this.usuarioId.set('');
    this.libroId.set('');
    this.desde.set('');
    this.hasta.set('');
  }
}
