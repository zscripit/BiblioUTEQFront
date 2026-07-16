import { Component, ElementRef, HostListener, afterNextRender, computed, inject, input, output, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../../../services/auth';

interface EnlaceNav {
  etiqueta: string;
  ruta?: string;
  fragmento?: string;
  exacto?: boolean;
}

/**
 * Header del área autenticada (dashboard, catálogo, reservas...): logo, navegación
 * horizontal entre secciones y el chip de usuario con su menú desplegable. El botón
 * hamburguesa solo notifica al padre — cada página sigue dueña de su propio <app-sidebar>.
 */
@Component({
  selector: 'app-panel-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './panel-header.html',
  styleUrl: './panel-header.scss',
})
export class PanelHeader {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly elementoAnfitrion = inject(ElementRef<HTMLElement>);

  readonly menuAbierto = input(false);
  readonly alternarMenu = output<void>();

  protected readonly usuario = this.auth.usuario;
  protected readonly menuUsuarioAbierto = signal(false);
  protected readonly navConScroll = signal(false);

  protected readonly enlacesNav: EnlaceNav[] = [
    { etiqueta: 'Inicio', ruta: '/home', exacto: true },
    { etiqueta: 'Catálogo', ruta: '/catalogo' },
    { etiqueta: 'Mis Préstamos', ruta: '/mis-prestamos' },
    { etiqueta: 'Reservas', ruta: '/mis-reservas' },
    { etiqueta: 'Historial', fragmento: 'avisos' },
  ];

  protected readonly iniciales = computed(() => {
    const nombre = this.usuario()?.nombre ?? 'Invitado';
    return nombre
      .split(' ')
      .slice(0, 2)
      .map((parte) => parte.charAt(0).toUpperCase())
      .join('');
  });

  constructor() {
    afterNextRender(() => {
      const actualizarScroll = () => this.navConScroll.set(window.scrollY > 8);
      actualizarScroll();
      window.addEventListener('scroll', actualizarScroll, { passive: true });
    });
  }

  @HostListener('document:click', ['$event'])
  protected alClicFuera(evento: MouseEvent): void {
    if (!this.menuUsuarioAbierto()) return;
    if (!this.elementoAnfitrion.nativeElement.querySelector('.panel__chip')?.contains(evento.target as Node)) {
      this.menuUsuarioAbierto.set(false);
    }
  }

  protected onHamburguesa(): void {
    this.alternarMenu.emit();
  }

  protected alternarMenuUsuario(evento: MouseEvent): void {
    evento.stopPropagation();
    this.menuUsuarioAbierto.update((abierto) => !abierto);
  }

  protected cerrarSesion(): void {
    this.menuUsuarioAbierto.set(false);
    this.auth.cerrarSesion();
  }

  /**
   * "Mis Préstamos"/"Historial" son secciones del Home; desde cualquier página se navega
   * ahí con el fragmento, y Home se encarga de hacer scroll cuando lo detecta.
   */
  protected irASeccion(fragmento: string, evento: Event): void {
    evento.preventDefault();
    this.router.navigate(['/home'], { fragment: fragmento });
  }
}
