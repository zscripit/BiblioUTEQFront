import { Injectable, computed, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CatalogoService, Libro } from '../../services/catalogo.service';
import { UsuarioAdmin, UsuariosAdminService } from '../../services/usuarios-admin';

export type EstadoUsuario = 'ACTIVO' | 'INACTIVO';
export type EstadoPrestamo = 'ACTIVO' | 'DEVUELTO' | 'VENCIDO';
export type EstadoReserva = 'ACTIVA' | 'CANCELADA' | 'EXPIRADA' | 'CONVERTIDA';
export type TipoNotificacion =
  | 'PRESTAMO_AUTORIZADO'
  | 'DEVOLUCION_REGISTRADA'
  | 'SANCION_GENERADA'
  | 'RESERVA_POR_EXPIRAR'
  | 'RESERVA_CREADA'
  | 'RESERVA_CANCELADA';

export interface UsuarioBiblioteca {
  id: string;
  nombre: string;
  correo: string;
  estado: EstadoUsuario;
  sancionesPendientes: number;
}

export interface LibroCatalogo {
  id: string;
  titulo: string;
  autor: string;
  categoria: string;
  portada: string;
  ejemplaresDisponibles: number;
}

export interface Prestamo {
  id: string;
  usuarioId: string;
  libroId: string;
  fechaPrestamo: string;
  fechaVencimiento: string;
  fechaDevolucion: string | null;
  estado: EstadoPrestamo;
  diasRetraso: number;
  montoMulta: number;
}

export interface PrestamoDetallado extends Prestamo {
  usuario: UsuarioBiblioteca;
  libro: LibroCatalogo;
}

export interface Sancion {
  id: string;
  usuarioId: string;
  prestamoId: string;
  monto: number;
  estado: 'PENDIENTE' | 'PAGADA';
  fechaGeneracion: string;
  fechaPago: string | null;
}

export interface NotificacionSistema {
  id: string;
  usuarioId: string;
  tipo: TipoNotificacion;
  referenciaId: string;
  mensaje: string;
  fechaEnvio: string;
}

export interface ReservaLibro {
  id: string;
  usuarioId: string;
  libroId: string;
  estado: EstadoReserva;
  fechaReserva: string;
  fechaExpiracion: string;
}

export interface FiltroHistorial {
  usuarioId?: string;
  desde?: string;
  hasta?: string;
}

export interface ResultadoRegistro {
  ok: boolean;
  mensaje: string;
  prestamo?: Prestamo;
}

export interface FiltroDevoluciones {
  usuarioId?: string;
  libroId?: string;
  desde?: string;
  hasta?: string;
}

export interface ResultadoDevolucion {
  ok: boolean;
  mensaje: string;
  tardia: boolean;
  diasRetraso: number;
  montoMulta: number;
  prestamo?: Prestamo;
}

export interface ResultadoReserva {
  ok: boolean;
  mensaje: string;
  reserva?: ReservaLibro;
}

const MULTA_POR_DIA_TARDIO = 15;
const DIA_MS = 24 * 60 * 60 * 1000;

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function diasEntre(fechaInicioIso: string, fechaFinIso: string): number {
  const diferencia = new Date(fechaFinIso).getTime() - new Date(fechaInicioIso).getTime();
  return Math.round(diferencia / DIA_MS);
}

/**
 * Administración de préstamos, devoluciones, sanciones, notificaciones y reservas de libros.
 * Los catálogos base (usuarios, libros) y las operaciones se respaldan contra los
 * microservicios reales (ms-user-auth-register, ms-catalogo, ms-prestamos, ms-devoluciones,
 * ms-notificaciones) vía el api-gateway.
 */
@Injectable({ providedIn: 'root' })
export class PrestamosService {
  private readonly http = inject(HttpClient);
  private readonly catalogoService = inject(CatalogoService);
  private readonly usuariosAdminService = inject(UsuariosAdminService);
  private readonly API_URL = 'http://localhost:8080/api/v1';

  private readonly _usuarios = signal<UsuarioBiblioteca[]>([]);
  private readonly _libros = signal<LibroCatalogo[]>([]);
  private readonly _prestamos = signal<Prestamo[]>([]);
  private readonly _sanciones = signal<Sancion[]>([]);
  private readonly _notificaciones = signal<NotificacionSistema[]>([]);
  private readonly _reservas = signal<ReservaLibro[]>([]);

  readonly usuarios = this._usuarios.asReadonly();
  readonly libros = this._libros.asReadonly();
  readonly prestamos = this._prestamos.asReadonly();
  readonly sanciones = this._sanciones.asReadonly();
  readonly notificaciones = this._notificaciones.asReadonly();
  readonly reservas = this._reservas.asReadonly();

  constructor() {
    // El catálogo y las sanciones propias del usuario autenticado son de lectura abierta.
    this.cargarCatalogo();
    this.cargarSanciones();
  }

  private cargarCatalogo(): void {
    this.catalogoService.listar().subscribe({
      next: (libros) => this._libros.set(libros.map((l) => this.mapLibro(l))),
      error: (err) => console.error('Error al cargar el catálogo:', err),
    });
  }

  private mapLibro(libro: Libro): LibroCatalogo {
    return {
      id: libro.id,
      titulo: libro.titulo,
      autor: libro.autor,
      categoria: libro.categoria,
      portada: libro.tienePortada ? this.catalogoService.portadaUrl(libro.id) : '',
      ejemplaresDisponibles: libro.stock - libro.stockReservado,
    };
  }

  /** Listado completo de usuarios de la biblioteca (requiere rol ADMINISTRADOR en el backend). */
  cargarUsuarios(): void {
    this.usuariosAdminService.listar().subscribe({
      next: (usuarios) => this._usuarios.set(usuarios.map((u) => this.mapUsuario(u))),
      error: (err) => console.error('Error al cargar usuarios:', err),
    });
  }

  private mapUsuario(usuario: UsuarioAdmin): UsuarioBiblioteca {
    return {
      id: usuario.id,
      nombre: usuario.nombreCompleto,
      correo: usuario.email,
      estado: usuario.activo ? 'ACTIVO' : 'INACTIVO',
      sancionesPendientes: this._sanciones().filter(
        (s) => s.usuarioId === usuario.id && s.estado === 'PENDIENTE',
      ).length,
    };
  }

  private cargarSanciones(): void {
    this.http.get<any[]>(`${this.API_URL}/sanciones`).subscribe({
      next: (data) => this._sanciones.set(data.map((s) => this.mapSancion(s))),
      error: (err) => console.error('Error al cargar sanciones del backend:', err),
    });
  }

  private mapSancion(s: any): Sancion {
    return {
      id: s.id,
      usuarioId: s.usuarioId,
      prestamoId: s.prestamoId,
      monto: s.monto,
      estado: s.estado,
      fechaGeneracion: s.fechaGeneracion ? s.fechaGeneracion.slice(0, 10) : hoyIso(),
      fechaPago: s.fechaPago ? s.fechaPago.slice(0, 10) : null,
    };
  }

  /** Listado completo de préstamos (requiere rol ADMINISTRADOR en el backend). */
  cargarPrestamos(): void {
    this.http.get<any[]>(`${this.API_URL}/prestamos`).subscribe({
      next: (data) => this._prestamos.set(data.map((p) => this.mapPrestamo(p))),
      error: (err) => console.error('Error al cargar préstamos:', err),
    });
  }

  /** Préstamos del usuario indicado (autoservicio: cualquier usuario autenticado puede ver los suyos). */
  cargarPrestamosDeUsuario(usuarioId: string): void {
    this.http.get<any[]>(`${this.API_URL}/prestamos/usuario/${usuarioId}`).subscribe({
      next: (data) => {
        const mapeados = data.map((p) => this.mapPrestamo(p));
        this._prestamos.update((lista) => [
          ...lista.filter((p) => p.usuarioId !== usuarioId),
          ...mapeados,
        ]);
      },
      error: (err) => console.error('Error al cargar tus préstamos:', err),
    });
  }

  private mapPrestamo(p: any): Prestamo {
    const fechaVencimiento = p.fechaLimite.slice(0, 10);
    const estado: EstadoPrestamo =
      p.estado === 'ACTIVO' && fechaVencimiento < hoyIso() ? 'VENCIDO' : p.estado;

    return {
      id: p.id,
      usuarioId: p.usuarioId,
      libroId: p.libroId,
      fechaPrestamo: p.fechaPrestamo.slice(0, 10),
      fechaVencimiento,
      fechaDevolucion: null,
      estado,
      diasRetraso: estado === 'VENCIDO' ? diasEntre(fechaVencimiento, hoyIso()) : 0,
      montoMulta: 0,
    };
  }

  /** Notificaciones del usuario indicado (el propio usuario autenticado, normalmente). */
  cargarNotificacionesDeUsuario(usuarioId: string): void {
    this.http.get<any[]>(`${this.API_URL}/notificaciones/usuario/${usuarioId}`).subscribe({
      next: (data) => {
        const mapeadas = data.map((n) => this.mapNotificacion(n));
        this._notificaciones.update((lista) => [
          ...lista.filter((item) => item.usuarioId !== usuarioId),
          ...mapeadas,
        ]);
      },
      error: (err) => console.error('Error al cargar notificaciones:', err),
    });
  }

  private mapNotificacion(n: any): NotificacionSistema {
    return {
      id: n.id,
      usuarioId: n.usuarioId,
      tipo: n.tipo,
      referenciaId: n.referenciaId,
      mensaje: n.mensaje,
      fechaEnvio: n.fechaEnvio ? n.fechaEnvio.slice(0, 10) : hoyIso(),
    };
  }

  /** Reservas activas del usuario indicado. */
  cargarReservasDeUsuario(usuarioId: string): void {
    this.http.get<any[]>(`${this.API_URL}/reservas/usuario/${usuarioId}/activas`).subscribe({
      next: (data) => {
        const mapeadas = data.map((r) => this.mapReserva(r));
        this._reservas.update((lista) => [
          ...lista.filter((r) => r.usuarioId !== usuarioId),
          ...mapeadas,
        ]);
      },
      error: (err) => console.error('Error al cargar reservas:', err),
    });
  }

  /** Historial completo de reservas del usuario indicado (autoservicio: cualquier estado). */
  cargarHistorialReservasDeUsuario(usuarioId: string): void {
    this.http.get<any[]>(`${this.API_URL}/reservas/usuario/${usuarioId}`).subscribe({
      next: (data) => {
        const mapeadas = data.map((r) => this.mapReserva(r));
        this._reservas.update((lista) => [
          ...lista.filter((r) => r.usuarioId !== usuarioId),
          ...mapeadas,
        ]);
      },
      error: (err) => console.error('Error al cargar el historial de reservas:', err),
    });
  }

  private mapReserva(r: any): ReservaLibro {
    return {
      id: r.id,
      usuarioId: r.usuarioId,
      libroId: r.libroId,
      estado: r.estado,
      fechaReserva: r.fechaReserva ? r.fechaReserva.slice(0, 10) : hoyIso(),
      fechaExpiracion: r.fechaExpiracion ? r.fechaExpiracion.slice(0, 10) : hoyIso(),
    };
  }

  readonly historialDetallado = computed<PrestamoDetallado[]>(() =>
    this._prestamos()
      .map((prestamo) => this.detallar(prestamo))
      .filter((prestamo): prestamo is PrestamoDetallado => prestamo !== null)
      .sort((a, b) => b.fechaPrestamo.localeCompare(a.fechaPrestamo)),
  );

  buscarUsuarios(termino: string): UsuarioBiblioteca[] {
    const valor = termino.trim().toLowerCase();
    if (!valor) {
      return this._usuarios();
    }
    return this._usuarios().filter(
      (usuario) =>
        usuario.nombre.toLowerCase().includes(valor) ||
        usuario.correo.toLowerCase().includes(valor),
    );
  }

  buscarLibros(termino: string): LibroCatalogo[] {
    const valor = termino.trim().toLowerCase();
    if (!valor) {
      return this._libros();
    }
    return this._libros().filter(
      (libro) =>
        libro.titulo.toLowerCase().includes(valor) || libro.autor.toLowerCase().includes(valor),
    );
  }

  /** Categorías distintas presentes en el catálogo, para el filtro. */
  readonly categorias = computed(() =>
    [...new Set(this._libros().map((libro) => libro.categoria))].sort(),
  );

  /** Catálogo público: búsqueda por título/autor, con filtro opcional de categoría. */
  buscarCatalogo(termino: string, categoria?: string): LibroCatalogo[] {
    const valor = termino.trim().toLowerCase();
    return this._libros().filter((libro) => {
      if (categoria && libro.categoria !== categoria) {
        return false;
      }
      if (!valor) {
        return true;
      }
      return (
        libro.titulo.toLowerCase().includes(valor) || libro.autor.toLowerCase().includes(valor)
      );
    });
  }

  /** PR01 — Registra un préstamo solo si el usuario está ACTIVO, sin sanciones y hay ejemplares disponibles. */
  registrarPrestamo(usuarioId: string, libroId: string, diasPlazo = 7): Observable<ResultadoRegistro> {
    const usuario = this._usuarios().find((u) => u.id === usuarioId);
    const libro = this._libros().find((l) => l.id === libroId);

    if (!usuario) {
      return of({ ok: false, mensaje: 'Selecciona un usuario válido.' });
    }
    if (!libro) {
      return of({ ok: false, mensaje: 'Selecciona un libro válido.' });
    }
    if (usuario.estado !== 'ACTIVO') {
      return of({ ok: false, mensaje: `${usuario.nombre} no tiene una cuenta ACTIVA.` });
    }
    if (usuario.sancionesPendientes > 0) {
      return of({ ok: false, mensaje: `${usuario.nombre} tiene sanciones pendientes por resolver.` });
    }
    if (libro.ejemplaresDisponibles <= 0) {
      return of({ ok: false, mensaje: `No hay ejemplares disponibles de "${libro.titulo}".` });
    }

    const fechaLimite = new Date(Date.now() + diasPlazo * DIA_MS).toISOString();
    const payload = { usuarioId, libroId, fechaLimite };

    return this.http.post<any>(`${this.API_URL}/prestamos`, payload).pipe(
      map((data) => {
        const prestamo = this.mapPrestamo(data);
        this._prestamos.update((lista) => [prestamo, ...lista]);
        this.ajustarDisponibilidad(libroId, -1);
        return { ok: true, mensaje: `Préstamo registrado para ${usuario.nombre}.`, prestamo };
      }),
      catchError((err) =>
        of({ ok: false, mensaje: err.error?.error ?? 'No se pudo registrar el préstamo.' }),
      ),
    );
  }

  /** PR02 — Préstamos con estado ACTIVO de un usuario específico. */
  prestamosActivosDeUsuario(usuarioId: string): PrestamoDetallado[] {
    return this.historialDetallado().filter(
      (prestamo) => prestamo.usuarioId === usuarioId && prestamo.estado === 'ACTIVO',
    );
  }

  /** PR03 — Historial completo con filtro opcional por usuario y/o rango de fechas. */
  historialFiltrado(filtro: FiltroHistorial): PrestamoDetallado[] {
    return this.historialDetallado().filter((prestamo) => {
      if (filtro.usuarioId && prestamo.usuarioId !== filtro.usuarioId) {
        return false;
      }
      if (filtro.desde && prestamo.fechaPrestamo < filtro.desde) {
        return false;
      }
      if (filtro.hasta && prestamo.fechaPrestamo > filtro.hasta) {
        return false;
      }
      return true;
    });
  }

  /** Préstamos con estado ACTIVO de toda la biblioteca, filtrables por usuario o libro. */
  buscarPrestamosActivos(termino: string): PrestamoDetallado[] {
    const activos = this.historialDetallado().filter((prestamo) => prestamo.estado === 'ACTIVO');
    const valor = termino.trim().toLowerCase();
    if (!valor) {
      return activos;
    }
    return activos.filter(
      (prestamo) =>
        prestamo.usuario.nombre.toLowerCase().includes(valor) ||
        prestamo.usuario.correo.toLowerCase().includes(valor) ||
        prestamo.libro.titulo.toLowerCase().includes(valor) ||
        prestamo.libro.autor.toLowerCase().includes(valor),
    );
  }

  /**
   * DE01/DE02 — Registra la devolución de un préstamo activo contra ms-devoluciones, que a su
   * vez marca el préstamo como DEVUELTO y genera la sanción correspondiente si hay retraso.
   */
  registrarDevolucion(prestamoId: string): Observable<ResultadoDevolucion> {
    const prestamo = this._prestamos().find((p) => p.id === prestamoId);
    if (!prestamo) {
      return of({ ok: false, mensaje: 'Selecciona un préstamo válido.', tardia: false, diasRetraso: 0, montoMulta: 0 });
    }
    if (prestamo.estado !== 'ACTIVO' && prestamo.estado !== 'VENCIDO') {
      return of({ ok: false, mensaje: 'Este préstamo ya fue devuelto.', tardia: false, diasRetraso: 0, montoMulta: 0 });
    }

    return this.http.post<any>(`${this.API_URL}/devoluciones`, { prestamoId }).pipe(
      map((data) => {
        const tardia = !!data.tardia;
        const diasRetraso = data.diasRetraso ?? 0;
        const montoMulta = tardia ? diasRetraso * MULTA_POR_DIA_TARDIO : 0;
        const fechaDevolucion = data.fechaDevolucion ? String(data.fechaDevolucion).slice(0, 10) : hoyIso();

        this._prestamos.update((lista) =>
          lista.map((p) =>
            p.id === prestamoId ? { ...p, estado: 'DEVUELTO', fechaDevolucion, diasRetraso, montoMulta } : p,
          ),
        );
        this.ajustarDisponibilidad(prestamo.libroId, 1);

        // La devolución pudo generar una sanción y una notificación en el backend; sincronizamos.
        this.cargarSanciones();
        this.cargarNotificacionesDeUsuario(prestamo.usuarioId);

        const mensaje = tardia
          ? `Devolución registrada con ${diasRetraso} día(s) de retraso. Se aplicó una multa de $${montoMulta}.`
          : `Devolución registrada a tiempo.`;

        return {
          ok: true,
          mensaje,
          tardia,
          diasRetraso,
          montoMulta,
          prestamo: { ...prestamo, estado: 'DEVUELTO' as const, fechaDevolucion, diasRetraso, montoMulta },
        };
      }),
      catchError((err) =>
        of({
          ok: false,
          mensaje: err.error?.error ?? 'No se pudo registrar la devolución.',
          tardia: false,
          diasRetraso: 0,
          montoMulta: 0,
        }),
      ),
    );
  }

  pagarSancion(sancionId: string): void {
    this.http.put<any>(`${this.API_URL}/sanciones/${sancionId}/pagar`, {}).subscribe({
      next: () => {
        this._sanciones.update((lista) =>
          lista.map((s) => {
            if (s.id === sancionId) {
              this._usuarios.update((users) =>
                users.map((u) =>
                  u.id === s.usuarioId
                    ? { ...u, sancionesPendientes: Math.max(0, u.sancionesPendientes - 1) }
                    : u,
                ),
              );
              return { ...s, estado: 'PAGADA' as const, fechaPago: hoyIso() };
            }
            return s;
          }),
        );
      },
      error: (err) => console.error('Error al registrar pago de sanción en backend:', err),
    });
  }

  /** Reserva un libro para el usuario indicado (aparta un ejemplar disponible). */
  crearReserva(usuarioId: string, libroId: string): Observable<ResultadoReserva> {
    return this.http.post<any>(`${this.API_URL}/reservas`, { usuarioId, libroId }).pipe(
      map((data) => {
        const reserva = this.mapReserva(data);
        this._reservas.update((lista) => [reserva, ...lista]);
        this.ajustarDisponibilidad(libroId, -1);
        return { ok: true, mensaje: 'Reserva registrada correctamente.', reserva };
      }),
      catchError((err) =>
        of({ ok: false, mensaje: err.error?.error ?? 'No se pudo registrar la reserva.' }),
      ),
    );
  }

  /** Cancela una reserva activa y libera el ejemplar apartado. */
  cancelarReserva(id: string): Observable<ResultadoReserva> {
    const reservaActual = this._reservas().find((r) => r.id === id);
    return this.http.put<any>(`${this.API_URL}/reservas/${id}/cancelar`, {}).pipe(
      map((data) => {
        const reserva = this.mapReserva(data);
        this._reservas.update((lista) => lista.map((r) => (r.id === id ? reserva : r)));
        if (reservaActual) {
          this.ajustarDisponibilidad(reservaActual.libroId, 1);
        }
        return { ok: true, mensaje: 'Reserva cancelada.', reserva };
      }),
      catchError((err) =>
        of({ ok: false, mensaje: err.error?.error ?? 'No se pudo cancelar la reserva.' }),
      ),
    );
  }

  private ajustarDisponibilidad(libroId: string, delta: number): void {
    this._libros.update((lista) =>
      lista.map((l) =>
        l.id === libroId ? { ...l, ejemplaresDisponibles: l.ejemplaresDisponibles + delta } : l,
      ),
    );
  }

  /** DE03 — Historial de devoluciones con filtro opcional por usuario, libro o fecha. */
  historialDevolucionesFiltrado(filtro: FiltroDevoluciones): PrestamoDetallado[] {
    return this.historialDetallado().filter((prestamo) => {
      if (prestamo.estado !== 'DEVUELTO') {
        return false;
      }
      if (filtro.usuarioId && prestamo.usuarioId !== filtro.usuarioId) {
        return false;
      }
      if (filtro.libroId && prestamo.libroId !== filtro.libroId) {
        return false;
      }
      if (filtro.desde && (prestamo.fechaDevolucion ?? '') < filtro.desde) {
        return false;
      }
      if (filtro.hasta && (prestamo.fechaDevolucion ?? '') > filtro.hasta) {
        return false;
      }
      return true;
    });
  }

  private detallar(prestamo: Prestamo): PrestamoDetallado | null {
    const usuario = this._usuarios().find((u) => u.id === prestamo.usuarioId);
    const libro = this._libros().find((l) => l.id === prestamo.libroId);
    if (!usuario || !libro) {
      return null;
    }
    return { ...prestamo, usuario, libro };
  }
}
