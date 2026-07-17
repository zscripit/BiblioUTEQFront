import { Component, DestroyRef, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Servicio {
  icono: 'libro' | 'reloj' | 'marcador' | 'sala' | 'nube' | 'campana';
  titulo: string;
  descripcion: string;
}

interface Paso {
  numero: string;
  titulo: string;
  descripcion: string;
}

@Component({
  selector: 'app-inicio',
  imports: [RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export class Inicio {
  private readonly destroyRef = inject(DestroyRef);
  private readonly heroRef = viewChild<ElementRef<HTMLElement>>('heroRef');

  /**
   * `heroListo` distingue "hay JS corriendo" de la marca estática que se sirve por SSR/prerender:
   * el hero es visible por defecto (sin JS) y solo se oculta para animarse una vez que el
   * componente confirma que puede reproducir la entrada. Evita contenido invisible sin JS.
   */
  protected readonly heroListo = signal(false);
  protected readonly heroVisible = signal(false);
  protected readonly parallaxX = signal(0);
  protected readonly parallaxY = signal(0);

  constructor() {
    afterNextRender(() => {
      this.heroListo.set(true);

      const hero = this.heroRef()?.nativeElement;
      if (!hero) return;

      const observador = new IntersectionObserver(
        ([entrada]) => {
          if (entrada.isIntersecting) {
            this.heroVisible.set(true);
            observador.disconnect();
          }
        },
        { threshold: 0.15 },
      );
      observador.observe(hero);

      const prefiereMovimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefiereMovimientoReducido) {
        hero.addEventListener('mousemove', this.moverParallax);
        hero.addEventListener('mouseleave', this.reiniciarParallax);
      }

      this.destroyRef.onDestroy(() => {
        observador.disconnect();
        hero.removeEventListener('mousemove', this.moverParallax);
        hero.removeEventListener('mouseleave', this.reiniciarParallax);
      });
    });
  }

  /** Desplazamiento normalizado (-0.5..0.5) del mouse dentro del hero, para el efecto parallax. */
  private readonly moverParallax = (evento: MouseEvent): void => {
    const hero = this.heroRef()?.nativeElement;
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    this.parallaxX.set((evento.clientX - rect.left) / rect.width - 0.5);
    this.parallaxY.set((evento.clientY - rect.top) / rect.height - 0.5);
  };

  private readonly reiniciarParallax = (): void => {
    this.parallaxX.set(0);
    this.parallaxY.set(0);
  };

  protected readonly estadisticas = [
    { valor: '12,500+', texto: 'Títulos en catálogo' },
    { valor: '3,200+', texto: 'Estudiantes activos' },
    { valor: '15', texto: 'Salas de estudio' },
    { valor: '24/7', texto: 'Catálogo en línea' },
  ];

  protected readonly servicios: Servicio[] = [
    {
      icono: 'libro',
      titulo: 'Catálogo en línea',
      descripcion:
        'Consulta la disponibilidad de más de 12,500 títulos académicos, técnicos y literarios desde cualquier dispositivo.',
    },
    {
      icono: 'reloj',
      titulo: 'Préstamos y devoluciones',
      descripcion:
        'Gestiona tus préstamos, consulta fechas de entrega y renueva tus libros sin filas ni trámites presenciales.',
    },
    {
      icono: 'marcador',
      titulo: 'Reservas anticipadas',
      descripcion:
        'Aparta el material que necesitas antes de llegar al campus y recógelo directamente en el mostrador.',
    },
    {
      icono: 'sala',
      titulo: 'Salas de estudio',
      descripcion:
        'Reserva espacios individuales o grupales equipados para tus proyectos, asesorías y trabajos en equipo.',
    },
    {
      icono: 'nube',
      titulo: 'Recursos digitales',
      descripcion:
        'Accede a bases de datos académicas, revistas electrónicas y libros digitales con tu cuenta institucional.',
    },
    {
      icono: 'campana',
      titulo: 'Avisos y recordatorios',
      descripcion:
        'Recibe notificaciones sobre vencimientos, nuevas adquisiciones y eventos culturales de la biblioteca.',
    },
  ];

  protected readonly pasos: Paso[] = [
    {
      numero: '01',
      titulo: 'Crea tu cuenta',
      descripcion:
        'Regístrate con tu matrícula y correo institucional de la UTEQ en menos de dos minutos.',
    },
    {
      numero: '02',
      titulo: 'Explora el catálogo',
      descripcion:
        'Busca por título, autor o carrera y descubre el material disponible para tu formación.',
    },
    {
      numero: '03',
      titulo: 'Solicita y disfruta',
      descripcion:
        'Reserva libros o salas, recoge tu material y administra todo desde tu panel personal.',
    },
  ];
}
