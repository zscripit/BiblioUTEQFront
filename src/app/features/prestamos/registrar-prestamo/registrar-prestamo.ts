import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrestamosService, ReservaDetallada } from '../prestamos.service';

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
  protected readonly reservaId = signal('');
  protected readonly diasPlazo = signal(7);

  protected readonly mensaje = signal('');
  protected readonly exito = signal(false);

  protected readonly usuarios = computed(() => this.prestamosService.buscarUsuarios(this.buscarUsuario()));
  protected readonly libros = computed(() => this.prestamosService.buscarLibros(this.buscarLibro()));

  /** Todas las reservas ACTIVA del sistema, listas para convertirse en préstamo. */
  protected readonly solicitudes = computed(() => this.prestamosService.solicitudesPendientes());

  protected readonly usuarioSeleccionado = computed(() =>
    this.prestamosService.usuarios().find((u) => u.id === this.usuarioId()),
  );
  protected readonly libroSeleccionado = computed(() =>
    this.prestamosService.libros().find((l) => l.id === this.libroId()),
  );

  /** Reservas ACTIVA del usuario seleccionado, listas para convertirse en préstamo. */
  protected readonly reservasPendientes = computed(() => {
    const usuarioId = this.usuarioId();
    if (!usuarioId) {
      return [];
    }
    return this.prestamosService
      .reservas()
      .filter((r) => r.usuarioId === usuarioId && r.estado === 'ACTIVA')
      .map((reserva) => ({
        ...reserva,
        libro: this.prestamosService.libros().find((l) => l.id === reserva.libroId) ?? null,
      }));
  });

  /** Selecciona directamente una solicitud (reserva) pendiente, sin tener que buscar al usuario. */
  seleccionarSolicitud(solicitud: ReservaDetallada): void {
    this.usuarioId.set(solicitud.usuarioId);
    this.libroId.set(solicitud.libroId);
    this.reservaId.set(solicitud.id);
    this.buscarUsuario.set('');
    this.buscarLibro.set('');
    this.mensaje.set('');
    this.prestamosService.cargarReservasDeUsuario(solicitud.usuarioId);
  }

  /** Vuelve a la lista de solicitudes pendientes sin haber registrado nada. */
  cancelarSeleccion(): void {
    this.usuarioId.set('');
    this.libroId.set('');
    this.reservaId.set('');
    this.mensaje.set('');
  }

  seleccionarUsuario(id: string): void {
    this.usuarioId.set(id);
    this.libroId.set('');
    this.reservaId.set('');
    this.mensaje.set('');
    this.prestamosService.cargarReservasDeUsuario(id);
  }

  /** Quita al usuario seleccionado y vuelve a mostrar la lista completa de usuarios. */
  cambiarUsuario(): void {
    this.usuarioId.set('');
    this.libroId.set('');
    this.reservaId.set('');
    this.buscarUsuario.set('');
    this.mensaje.set('');
  }

  seleccionarLibro(id: string): void {
    this.libroId.set(id);
    this.reservaId.set('');
    this.mensaje.set('');
  }

  /** Quita el libro seleccionado y vuelve a mostrar la lista completa de libros. */
  cambiarLibro(): void {
    this.libroId.set('');
    this.reservaId.set('');
    this.buscarLibro.set('');
    this.mensaje.set('');
  }

  seleccionarReserva(reservaId: string, libroId: string): void {
    this.reservaId.set(reservaId);
    this.libroId.set(libroId);
    this.mensaje.set('');
  }

  registrar(): void {
    if (!this.usuarioId() || !this.libroId()) {
      this.exito.set(false);
      this.mensaje.set('Selecciona un usuario y un libro para continuar.');
      return;
    }

    this.prestamosService
      .registrarPrestamo(this.usuarioId(), this.libroId(), this.diasPlazo(), this.reservaId() || undefined)
      .subscribe((resultado) => {
        this.exito.set(resultado.ok);
        this.mensaje.set(resultado.mensaje);

        if (resultado.ok) {
          this.usuarioId.set('');
          this.libroId.set('');
          this.reservaId.set('');
          this.buscarUsuario.set('');
          this.buscarLibro.set('');
          this.diasPlazo.set(7);
        }
      });
  }
}
