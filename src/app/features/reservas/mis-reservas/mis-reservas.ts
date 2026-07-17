import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../../services/auth';
import { Sidebar } from '../../../components/layouts/sidebar/sidebar';
import { PanelHeader } from '../../../components/layouts/panel-header/panel-header';
import { PanelFooter } from '../../../components/layouts/panel-footer/panel-footer';
import { PrestamosService } from '../../prestamos/prestamos.service';

type FiltroEstado = 'TODAS' | 'ACTIVA' | 'CONVERTIDA' | 'CANCELADA' | 'EXPIRADA';

@Component({
  selector: 'app-mis-reservas',
  imports: [FormsModule, Sidebar, PanelHeader, PanelFooter],
  templateUrl: './mis-reservas.html',
  styleUrl: './mis-reservas.scss',
})
export class MisReservas {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly prestamosService = inject(PrestamosService);

  protected readonly menuAbierto = signal(false);
  protected readonly usuarioId = computed(() => this.auth.usuario()?.id ?? '');

  protected readonly buscarLibro = signal('');
  protected readonly filtro = signal<FiltroEstado>('TODAS');
  protected readonly mensaje = signal('');
  protected readonly exito = signal(false);

  protected readonly librosParaReservar = computed(() =>
    this.buscarLibro().trim()
      ? this.prestamosService.buscarLibros(this.buscarLibro()).filter((l) => l.ejemplaresDisponibles > 0)
      : [],
  );

  protected readonly misReservas = computed(() => {
    const id = this.usuarioId();
    const estado = this.filtro();
    return this.prestamosService
      .reservas()
      .filter((r) => r.usuarioId === id)
      .filter((r) => estado === 'TODAS' || r.estado === estado)
      .map((reserva) => ({
        ...reserva,
        libro: this.prestamosService.libros().find((l) => l.id === reserva.libroId) ?? null,
      }))
      .sort((a, b) => b.fechaReserva.localeCompare(a.fechaReserva));
  });

  constructor() {
    // Solo front-end: si no hay sesión activa, regresamos al login.
    if (!this.auth.estaAutenticado()) {
      this.router.navigateByUrl('/login');
      return;
    }

    const id = this.usuarioId();
    if (id) {
      this.prestamosService.cargarHistorialReservasDeUsuario(id);
    }
  }

  alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }

  cambiarFiltro(estado: FiltroEstado): void {
    this.filtro.set(estado);
  }

  reservar(libroId: string): void {
    const usuarioId = this.usuarioId();
    if (!usuarioId) {
      return;
    }
    this.mensaje.set('');
    this.prestamosService.crearReserva(usuarioId, libroId).subscribe((resultado) => {
      this.exito.set(resultado.ok);
      this.mensaje.set(resultado.mensaje);
      if (resultado.ok) {
        this.buscarLibro.set('');
      }
    });
  }

  cancelar(reservaId: string): void {
    this.mensaje.set('');
    this.prestamosService.cancelarReserva(reservaId).subscribe((resultado) => {
      this.exito.set(resultado.ok);
      this.mensaje.set(resultado.mensaje);
    });
  }
}
