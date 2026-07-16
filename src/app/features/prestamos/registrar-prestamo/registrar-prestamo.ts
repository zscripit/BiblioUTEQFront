import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrestamosService } from '../prestamos.service';

@Component({
  selector: 'app-registrar-prestamo',
  imports: [FormsModule],
  templateUrl: './registrar-prestamo.html',
  styleUrl: './registrar-prestamo.scss',
})
export class RegistrarPrestamo {
  private readonly prestamosService = inject(PrestamosService);

  protected readonly buscarUsuario = signal('');
  protected readonly buscarLibro = signal('');
  protected readonly usuarioId = signal('');
  protected readonly libroId = signal('');
  protected readonly diasPlazo = signal(7);

  protected readonly mensaje = signal('');
  protected readonly exito = signal(false);

  protected readonly usuarios = computed(() => this.prestamosService.buscarUsuarios(this.buscarUsuario()));
  protected readonly libros = computed(() => this.prestamosService.buscarLibros(this.buscarLibro()));

  protected readonly usuarioSeleccionado = computed(() =>
    this.prestamosService.usuarios().find((u) => u.id === this.usuarioId()),
  );
  protected readonly libroSeleccionado = computed(() =>
    this.prestamosService.libros().find((l) => l.id === this.libroId()),
  );

  seleccionarUsuario(id: string): void {
    this.usuarioId.set(id);
    this.mensaje.set('');
  }

  seleccionarLibro(id: string): void {
    this.libroId.set(id);
    this.mensaje.set('');
  }

  registrar(): void {
    if (!this.usuarioId() || !this.libroId()) {
      this.exito.set(false);
      this.mensaje.set('Selecciona un usuario y un libro para continuar.');
      return;
    }

    this.prestamosService
      .registrarPrestamo(this.usuarioId(), this.libroId(), this.diasPlazo())
      .subscribe((resultado) => {
        this.exito.set(resultado.ok);
        this.mensaje.set(resultado.mensaje);

        if (resultado.ok) {
          this.usuarioId.set('');
          this.libroId.set('');
          this.buscarUsuario.set('');
          this.buscarLibro.set('');
          this.diasPlazo.set(7);
        }
      });
  }
}
