import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrestamosService } from '../../prestamos/prestamos.service';

@Component({
  selector: 'app-registrar-devolucion',
  imports: [FormsModule],
  templateUrl: './registrar-devolucion.html',
  styleUrl: './registrar-devolucion.scss',
})
export class RegistrarDevolucion {
  private readonly prestamosService = inject(PrestamosService);

  protected readonly buscarPrestamo = signal('');
  protected readonly prestamoId = signal('');

  protected readonly prestamosActivos = computed(() =>
    this.prestamosService.buscarPrestamosActivos(this.buscarPrestamo()),
  );

  protected readonly prestamoSeleccionado = computed(() =>
    this.prestamosService.buscarPrestamosActivos('').find((p) => p.id === this.prestamoId()),
  );

  protected readonly mensaje = signal('');
  protected readonly exito = signal(false);
  protected readonly tardia = signal(false);
  protected readonly diasRetraso = signal(0);
  protected readonly montoMulta = signal(0);

  seleccionarPrestamo(id: string): void {
    this.prestamoId.set(id);
    this.mensaje.set('');
  }

  cambiarSeleccion(): void {
    this.prestamoId.set('');
    this.buscarPrestamo.set('');
    this.mensaje.set('');
  }

  registrar(): void {
    if (!this.prestamoId()) {
      this.exito.set(false);
      this.mensaje.set('Selecciona el préstamo a devolver.');
      return;
    }

    this.prestamosService.registrarDevolucion(this.prestamoId()).subscribe((resultado) => {
      this.exito.set(resultado.ok);
      this.mensaje.set(resultado.mensaje);
      this.tardia.set(resultado.tardia);
      this.diasRetraso.set(resultado.diasRetraso);
      this.montoMulta.set(resultado.montoMulta);

      if (resultado.ok) {
        this.prestamoId.set('');
        this.buscarPrestamo.set('');
      }
    });
  }
}
