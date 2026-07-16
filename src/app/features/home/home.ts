import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { Sidebar } from '../../components/layouts/sidebar/sidebar';
import { PrestamosService } from '../prestamos/prestamos.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink, Sidebar],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly prestamosService = inject(PrestamosService);

  protected readonly usuario = this.auth.usuario;
  protected readonly menuAbierto = signal(false);

  protected readonly usuarioBiblioteca = computed(() => {
    const email = this.usuario()?.correo;
    if (!email) return null;
    return this.prestamosService.usuarios().find((u) => u.correo === email) ?? null;
  });

  protected readonly notificacionesUsuario = computed(() => {
    const u = this.usuarioBiblioteca();
    if (!u) return [];
    return this.prestamosService.notificaciones().filter((n) => n.usuarioId === u.id);
  });

  protected readonly iniciales = computed(() => {
    const nombre = this.usuario()?.nombre ?? 'Invitado';
    return nombre
      .split(' ')
      .slice(0, 2)
      .map((parte) => parte.charAt(0).toUpperCase())
      .join('');
  });

  protected readonly resumen = [
    { valor: '3', texto: 'Préstamos activos', icono: 'libro' },
    { valor: '1', texto: 'Reserva pendiente', icono: 'marcador' },
    { valor: '2', texto: 'Próximos vencimientos', icono: 'reloj' },
    { valor: '12', texto: 'Libros leídos este año', icono: 'estrella' },
  ] as const;

  protected readonly prestamos = [
    {
      titulo: 'Frankenstein',
      autor: 'Mary Shelley',
      vence: '18 de julio de 2026',
      estado: 'En curso',
    },
    {
      titulo: 'El Resplandor',
      autor: 'Stephen King',
      vence: '21 de julio de 2026',
      estado: 'En curso',
    },
    {
      titulo: 'Cumbres Borrascosas',
      autor: 'Emily Brontë',
      vence: '12 de julio de 2026',
      estado: 'Por vencer',
    },
  ];

  protected readonly recomendados = [
    { titulo: 'Coraline', autor: 'Neil Gaiman', categoria: 'Fantasía oscura' },
    { titulo: 'La Casa de los Espíritus', autor: 'Isabel Allende', categoria: 'Realismo mágico' },
    { titulo: 'Orgullo y Prejuicio', autor: 'Jane Austen', categoria: 'Romance clásico' },
    { titulo: 'Cándido', autor: 'Voltaire', categoria: 'Humor clásico' },
  ];

  constructor() {
    // Solo front-end: si no hay sesión activa, regresamos al login.
    if (!this.auth.estaAutenticado()) {
      this.router.navigateByUrl('/login');
    }
  }

  alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }
}
