import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogoService, Libro, LibroForm } from '../../../services/catalogo.service';

@Component({
  selector: 'app-libros-admin',
  imports: [FormsModule],
  templateUrl: './libros.html',
  styleUrl: './libros.scss',
})
export class LibrosAdmin {
  private readonly catalogoService = inject(CatalogoService);

  protected readonly libros = signal<Libro[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly modo = signal<'lista' | 'form'>('lista');
  protected readonly libroSeleccionado = signal<Libro | null>(null);

  protected formulario: LibroForm = {
    titulo: '',
    isbn: '',
    autor: '',
    categoria: '',
    stock: 1,
  };

  private portadaSeleccionada: File | null = null;

  constructor() {
    this.cargarLibros();
  }

  protected disponible(libro: Libro): boolean {
    return libro.activo && libro.stock - libro.stockReservado > 0;
  }

  protected portadaUrl(libro: Libro): string | null {
    return libro.tienePortada ? this.catalogoService.portadaUrl(libro.id) : null;
  }

  protected onPortadaSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;

    if (archivo && archivo.type !== 'image/png') {
      this.error.set('La portada debe ser un archivo PNG.');
      input.value = '';
      this.portadaSeleccionada = null;
      return;
    }

    this.portadaSeleccionada = archivo;
  }

  protected abrirFormulario(nuevo: boolean = false): void {
    if (nuevo) {
      this.libroSeleccionado.set(null);
      this.formulario = { titulo: '', isbn: '', autor: '', categoria: '', stock: 1 };
    }

    this.portadaSeleccionada = null;
    this.error.set(null);
    this.modo.set('form');
  }

  protected editarLibro(libro: Libro): void {
    this.libroSeleccionado.set(libro);
    this.formulario = {
      titulo: libro.titulo,
      isbn: libro.isbn,
      autor: libro.autor,
      categoria: libro.categoria,
      stock: libro.stock,
    };
    this.portadaSeleccionada = null;
    this.error.set(null);
    this.modo.set('form');
  }

  protected guardarLibro(): void {
    const { titulo, isbn, autor, categoria, stock } = this.formulario;

    if (!titulo.trim() || !isbn.trim() || !autor.trim() || !categoria.trim()) {
      return;
    }

    const actual = this.libroSeleccionado();
    const payload: LibroForm = { titulo, isbn, autor, categoria, stock };

    const peticion = actual
      ? this.catalogoService.actualizar(actual.id, payload)
      : this.catalogoService.crear(payload);

    peticion.subscribe({
      next: (libro) => this.subirPortadaSiHay(libro.id),
      error: (err) => {
        this.error.set(err.error?.error ?? 'No se pudo guardar el libro.');
      },
    });
  }

  private subirPortadaSiHay(libroId: string): void {
    if (!this.portadaSeleccionada) {
      this.cargarLibros();
      this.volverALista();
      return;
    }

    this.catalogoService.subirPortada(libroId, this.portadaSeleccionada).subscribe({
      next: () => {
        this.cargarLibros();
        this.volverALista();
      },
      error: (err) => {
        this.error.set(err.error?.error ?? 'El libro se guardó, pero no se pudo subir la portada.');
      },
    });
  }

  protected eliminarLibro(id: string): void {
    this.catalogoService.eliminar(id).subscribe({
      next: () => this.libros.update((items) => items.filter((libro) => libro.id !== id)),
      error: () => this.error.set('No se pudo eliminar el libro.'),
    });
  }

  protected volverALista(): void {
    this.libroSeleccionado.set(null);
    this.modo.set('lista');
  }

  private cargarLibros(): void {
    this.cargando.set(true);
    this.catalogoService.listar().subscribe({
      next: (libros) => {
        this.libros.set(libros);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el catálogo.');
        this.cargando.set(false);
      },
    });
  }
}
