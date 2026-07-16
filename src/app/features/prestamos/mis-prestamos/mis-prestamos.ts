import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../../services/auth';
import { Sidebar } from '../../../components/layouts/sidebar/sidebar';
import { PanelHeader } from '../../../components/layouts/panel-header/panel-header';
import { PanelFooter } from '../../../components/layouts/panel-footer/panel-footer';
import { PrestamosService } from '../prestamos.service';

type FiltroEstado = 'TODOS' | 'ACTIVO' | 'VENCIDO' | 'DEVUELTO';

@Component({
  selector: 'app-mis-prestamos',
  imports: [Sidebar, PanelHeader, PanelFooter],
  templateUrl: './mis-prestamos.html',
  styleUrl: './mis-prestamos.scss',
})
export class MisPrestamos {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly prestamosService = inject(PrestamosService);

  protected readonly menuAbierto = signal(false);
  protected readonly usuarioId = computed(() => this.auth.usuario()?.id ?? '');
  protected readonly filtro = signal<FiltroEstado>('TODOS');

  protected readonly misPrestamos = computed(() => {
    const id = this.usuarioId();
    const estado = this.filtro();
    return this.prestamosService
      .prestamos()
      .filter((p) => p.usuarioId === id)
      .filter((p) => estado === 'TODOS' || p.estado === estado)
      .map((prestamo) => ({
        ...prestamo,
        libro: this.prestamosService.libros().find((l) => l.id === prestamo.libroId) ?? null,
      }))
      .sort((a, b) => b.fechaPrestamo.localeCompare(a.fechaPrestamo));
  });

  protected readonly activosCount = computed(
    () => this.prestamosService.prestamos().filter((p) => p.usuarioId === this.usuarioId() && p.estado !== 'DEVUELTO').length,
  );

  constructor() {
    // Solo front-end: si no hay sesión activa, regresamos al login.
    if (!this.auth.estaAutenticado()) {
      this.router.navigateByUrl('/login');
      return;
    }

    const id = this.usuarioId();
    if (id) {
      this.prestamosService.cargarPrestamosDeUsuario(id);
    }
  }

  alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }

  cambiarFiltro(estado: FiltroEstado): void {
    this.filtro.set(estado);
  }
}
