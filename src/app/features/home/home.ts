import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { Sidebar } from '../../components/layouts/sidebar/sidebar';
import { PanelHeader } from '../../components/layouts/panel-header/panel-header';
import { PanelFooter } from '../../components/layouts/panel-footer/panel-footer';
import { PrestamosService } from '../prestamos/prestamos.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink, Sidebar, PanelHeader, PanelFooter],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly prestamosService = inject(PrestamosService);

  protected readonly usuario = this.auth.usuario;
  protected readonly menuAbierto = signal(false);

  constructor() {
    // Solo front-end: si no hay sesión activa, regresamos al login.
    if (!this.auth.estaAutenticado()) {
      this.router.navigateByUrl('/login');
    }

    const idUsuario = this.usuario()?.id;
    if (idUsuario) {
      this.prestamosService.cargarNotificacionesDeUsuario(idUsuario);
      this.prestamosService.cargarPrestamosDeUsuario(idUsuario);
    }

    // El header/footer (en esta u otras páginas) navegan aquí con un fragmento
    // ("mis-prestamos", "avisos") para llevar al usuario a la sección correspondiente.
    this.route.fragment.subscribe((fragmento) => {
      if (!fragmento) return;
      setTimeout(() => {
        document.getElementById(fragmento)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  protected readonly notificacionesUsuario = computed(() => {
    const id = this.usuario()?.id;
    if (!id) return [];
    return this.prestamosService.notificaciones().filter((n) => n.usuarioId === id);
  });

  protected readonly resumen = [
    { valor: '3', texto: 'Préstamos activos', icono: 'libro' },
    { valor: '1', texto: 'Reserva pendiente', icono: 'marcador' },
    { valor: '2', texto: 'Próximos vencimientos', icono: 'reloj' },
    { valor: '12', texto: 'Libros leídos este año', icono: 'estrella' },
  ] as const;

  protected readonly misPrestamos = computed(() => {
    const id = this.usuario()?.id;
    if (!id) return [];
    return this.prestamosService
      .prestamos()
      .filter((p) => p.usuarioId === id && p.estado !== 'DEVUELTO')
      .map((p) => ({
        titulo: this.prestamosService.libros().find((l) => l.id === p.libroId)?.titulo ?? 'Libro no disponible',
        autor: this.prestamosService.libros().find((l) => l.id === p.libroId)?.autor ?? '',
        vence: p.fechaVencimiento,
        estado: p.estado === 'VENCIDO' ? 'Por vencer' : 'En curso',
      }))
      .sort((a, b) => a.vence.localeCompare(b.vence))
      .slice(0, 5);
  });

  protected readonly recomendados = [
    { titulo: 'Coraline', autor: 'Neil Gaiman', categoria: 'Fantasía oscura' },
    { titulo: 'La Casa de los Espíritus', autor: 'Isabel Allende', categoria: 'Realismo mágico' },
    { titulo: 'Orgullo y Prejuicio', autor: 'Jane Austen', categoria: 'Romance clásico' },
    { titulo: 'Cándido', autor: 'Voltaire', categoria: 'Humor clásico' },
  ];

  alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }
}
