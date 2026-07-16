import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { CatalogoService, Libro } from '../../services/catalogo.service';
import { Sidebar } from '../../components/layouts/sidebar/sidebar';

@Component({
  selector: 'app-catalogo',
  imports: [FormsModule, Sidebar],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.scss',
})
export class Catalogo {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly catalogoService = inject(CatalogoService);

  protected readonly usuario = this.auth.usuario;
  protected readonly menuAbierto = signal(false);

  protected readonly busqueda = signal('');
  protected readonly categoriaSeleccionada = signal('');
  protected readonly imagenesConError = signal(new Set<string>());

  private readonly _catalogo = signal<Libro[]>([]);

  protected readonly categorias = computed(() =>
    [...new Set(this._catalogo().map((libro) => libro.categoria))].filter(Boolean).sort(),
  );

  protected readonly libros = computed(() => {
    const valor = this.busqueda().trim().toLowerCase();
    const categoria = this.categoriaSeleccionada();

    return this._catalogo()
      .filter((libro) => !categoria || libro.categoria === categoria)
      .filter(
        (libro) =>
          !valor ||
          libro.titulo.toLowerCase().includes(valor) ||
          libro.autor.toLowerCase().includes(valor),
      )
      .map((libro) => ({
        ...libro,
        portada: libro.tienePortada ? this.catalogoService.portadaUrl(libro.id) : '',
        ejemplaresDisponibles: libro.stock - libro.stockReservado,
      }));
  });

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
      return;
    }

    this.catalogoService.listar().subscribe({
      next: (libros) => this._catalogo.set(libros),
      error: (err) => console.error('Error al cargar el catálogo:', err),
    });
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
