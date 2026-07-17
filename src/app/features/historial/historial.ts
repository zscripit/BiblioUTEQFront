import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { Sidebar } from '../../components/layouts/sidebar/sidebar';
import { PanelHeader } from '../../components/layouts/panel-header/panel-header';
import { PanelFooter } from '../../components/layouts/panel-footer/panel-footer';
import { PrestamosService } from '../prestamos/prestamos.service';

type Pestana = 'PRESTAMOS' | 'RESERVAS' | 'SANCIONES';

@Component({
  selector: 'app-historial',
  imports: [Sidebar, PanelHeader, PanelFooter],
  templateUrl: './historial.html',
  styleUrl: './historial.scss',
})
export class Historial {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly prestamosService = inject(PrestamosService);

  protected readonly menuAbierto = signal(false);
  protected readonly usuarioId = computed(() => this.auth.usuario()?.id ?? '');
  protected readonly pestana = signal<Pestana>('PRESTAMOS');

  protected readonly historialPrestamos = computed(() => {
    const id = this.usuarioId();
    return this.prestamosService
      .prestamos()
      .filter((p) => p.usuarioId === id)
      .map((prestamo) => ({
        ...prestamo,
        libro: this.prestamosService.libros().find((l) => l.id === prestamo.libroId) ?? null,
      }))
      .sort((a, b) => b.fechaPrestamo.localeCompare(a.fechaPrestamo));
  });

  protected readonly historialReservas = computed(() => {
    const id = this.usuarioId();
    return this.prestamosService
      .reservas()
      .filter((r) => r.usuarioId === id)
      .map((reserva) => ({
        ...reserva,
        libro: this.prestamosService.libros().find((l) => l.id === reserva.libroId) ?? null,
      }))
      .sort((a, b) => b.fechaReserva.localeCompare(a.fechaReserva));
  });

  protected readonly historialSanciones = computed(() => {
    const id = this.usuarioId();
    return this.prestamosService
      .sanciones()
      .filter((s) => s.usuarioId === id)
      .map((sancion) => {
        const prestamo = this.prestamosService.prestamos().find((p) => p.id === sancion.prestamoId) ?? null;
        const libro = prestamo
          ? this.prestamosService.libros().find((l) => l.id === prestamo.libroId) ?? null
          : null;
        return { ...sancion, libro };
      })
      .sort((a, b) => b.fechaGeneracion.localeCompare(a.fechaGeneracion));
  });

  constructor() {
    // Solo front-end: si no hay sesión activa, regresamos al login.
    if (!this.auth.estaAutenticado()) {
      this.router.navigateByUrl('/login');
      return;
    }

    const id = this.usuarioId();
    if (id) {
      this.prestamosService.cargarPrestamosDeUsuario(id);
      this.prestamosService.cargarHistorialReservasDeUsuario(id);
    }
  }

  alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }

  cambiarPestana(pestana: Pestana): void {
    this.pestana.set(pestana);
  }
}
