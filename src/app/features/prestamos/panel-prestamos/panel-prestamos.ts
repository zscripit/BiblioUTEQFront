import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Auth } from '../../../services/auth';
import { PanelHeader } from '../../../components/layouts/panel-header/panel-header';
import { PanelFooter } from '../../../components/layouts/panel-footer/panel-footer';
import { PrestamosSidebar } from '../prestamos-sidebar/prestamos-sidebar';
import { PrestamosService } from '../prestamos.service';

@Component({
  selector: 'app-panel-prestamos',
  imports: [RouterOutlet, PanelHeader, PanelFooter, PrestamosSidebar],
  templateUrl: './panel-prestamos.html',
  styleUrl: './panel-prestamos.scss',
})
export class PanelPrestamos {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly prestamosService = inject(PrestamosService);

  protected readonly menuAbierto = signal(false);

  constructor() {
    // Solo front-end: si no hay sesión activa, regresamos al login.
    if (!this.auth.estaAutenticado()) {
      this.router.navigateByUrl('/login');
      return;
    }

    // Usuarios, préstamos y reservas son de administración; se cargan una sola vez para todo el panel.
    this.prestamosService.cargarUsuarios();
    this.prestamosService.cargarPrestamos();
    this.prestamosService.cargarReservas();
  }

  alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }
}
