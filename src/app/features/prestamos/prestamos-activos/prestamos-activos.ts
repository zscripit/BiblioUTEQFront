import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrestamosService } from '../prestamos.service';

@Component({
  selector: 'app-prestamos-activos',
  imports: [FormsModule],
  templateUrl: './prestamos-activos.html',
  styleUrl: './prestamos-activos.scss',
})
export class PrestamosActivos {
  private readonly prestamosService = inject(PrestamosService);

  protected readonly buscarPrestamo = signal('');

  protected readonly prestamosActivos = computed(() =>
    this.prestamosService.buscarPrestamosActivos(this.buscarPrestamo()),
  );
}
