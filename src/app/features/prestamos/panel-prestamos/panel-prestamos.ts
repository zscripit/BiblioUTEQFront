import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Auth } from '../../../services/auth';
import { PrestamosSidebar } from '../prestamos-sidebar/prestamos-sidebar';
import { PrestamosService } from '../prestamos.service';

@Component({
  selector: 'app-panel-prestamos',
  imports: [RouterLink, RouterOutlet, PrestamosSidebar],
  templateUrl: './panel-prestamos.html',
  styleUrl: './panel-prestamos.scss',
})
export class PanelPrestamos {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly prestamosService = inject(PrestamosService);

  protected readonly usuario = this.auth.usuario;
  protected readonly menuAbierto = signal(false);

  protected readonly iniciales = computed(() => {
    const nombre = this.usuario()?.nombre ?? 'Bibliotecario';
    return nombre
      .split(' ')
      .slice(0, 2)
      .map((parte) => parte.charAt(0).toUpperCase())
      .join('');
  });

  constructor() {
    // Solo front-end: si no hay sesión activa, regresamos al login.
    if (!this.auth.estaAutenticado()) {
      this.router.navigateByUrl('/login');
      return;
    }

    // Usuarios y préstamos son de administración; se cargan una sola vez para todo el panel.
    this.prestamosService.cargarUsuarios();
    this.prestamosService.cargarPrestamos();
  }

  alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }
}
