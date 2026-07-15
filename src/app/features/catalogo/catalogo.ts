import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { Sidebar } from '../../components/layouts/sidebar/sidebar';
import { PrestamosService } from '../prestamos/prestamos.service';

@Component({
  selector: 'app-catalogo',
  imports: [FormsModule, Sidebar],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.scss',
})
export class Catalogo {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly prestamosService = inject(PrestamosService);

  protected readonly usuario = this.auth.usuario;
  protected readonly menuAbierto = signal(false);

  protected readonly busqueda = signal('');
  protected readonly categoriaSeleccionada = signal('');
  protected readonly imagenesConError = signal(new Set<string>());

  protected readonly categorias = this.prestamosService.categorias;

  protected readonly libros = computed(() =>
    this.prestamosService.buscarCatalogo(this.busqueda(), this.categoriaSeleccionada() || undefined),
  );

  protected readonly iniciales = computed(() => {
    const nombre = this.usuario()?.nombre ?? 'Invitado';
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
    }
  }

  alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }

  seleccionarCategoria(categoria: string): void {
    this.categoriaSeleccionada.set(categoria === this.categoriaSeleccionada() ? '' : categoria);
  }

  marcarImagenFallida(libroId: string): void {
    this.imagenesConError.update((set) => new Set(set).add(libroId));
  }
}
