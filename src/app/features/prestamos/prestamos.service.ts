import { Injectable, computed, signal } from '@angular/core';

export type EstadoUsuario = 'ACTIVO' | 'INACTIVO';
export type EstadoPrestamo = 'ACTIVO' | 'DEVUELTO' | 'VENCIDO';

export interface UsuarioBiblioteca {
  id: string;
  nombre: string;
  matricula: string;
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

const MULTA_POR_DIA_TARDIO = 15;
const DIA_MS = 24 * 60 * 60 * 1000;

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function sumarDias(fechaIso: string, dias: number): string {
  return new Date(new Date(fechaIso).getTime() + dias * DIA_MS).toISOString().slice(0, 10);
}

function diasEntre(fechaInicioIso: string, fechaFinIso: string): number {
  const diferencia = new Date(fechaFinIso).getTime() - new Date(fechaInicioIso).getTime();
  return Math.round(diferencia / DIA_MS);
}

/**
 * PR01-PR03 (EPIC05): administración de préstamos, solo front-end.
 * Los datos viven en memoria mediante signals; no hay backend todavía.
 */
@Injectable({ providedIn: 'root' })
export class PrestamosService {
  private readonly _usuarios = signal<UsuarioBiblioteca[]>([
    { id: 'u1', nombre: 'Ana López Ramírez', matricula: '21DS045', correo: 'ana.lopez@uteq.edu.mx', estado: 'ACTIVO', sancionesPendientes: 0 },
    { id: 'u2', nombre: 'Carlos Medina Ortiz', matricula: '20IS012', correo: 'carlos.medina@uteq.edu.mx', estado: 'ACTIVO', sancionesPendientes: 0 },
    { id: 'u3', nombre: 'Diana Torres Vega', matricula: '22RT033', correo: 'diana.torres@uteq.edu.mx', estado: 'ACTIVO', sancionesPendientes: 1 },
    { id: 'u4', nombre: 'Emilio Salas Cruz', matricula: '19DS098', correo: 'emilio.salas@uteq.edu.mx', estado: 'INACTIVO', sancionesPendientes: 0 },
  ]);

  private readonly _libros = signal<LibroCatalogo[]>([
    { id: 'l20', titulo: 'Frankenstein', autor: 'Mary Shelley', categoria: 'Gótico clásico', portada: 'frankenstein.jpg', ejemplaresDisponibles: 3 },
    { id: 'l21', titulo: 'El Extraño Caso del Dr. Jekyll y Mr. Hyde', autor: 'Robert Louis Stevenson', categoria: 'Gótico clásico', portada: 'dr-jekyll-y-mr-hyde.jpg', ejemplaresDisponibles: 2 },
    { id: 'l22', titulo: 'La Caída de la Casa Usher', autor: 'Edgar Allan Poe', categoria: 'Gótico clásico', portada: 'la-caida-de-la-casa-usher.jpg', ejemplaresDisponibles: 1 },
    { id: 'l23', titulo: 'Carmilla', autor: 'Sheridan Le Fanu', categoria: 'Gótico clásico', portada: 'carmilla.jpg', ejemplaresDisponibles: 0 },
    { id: 'l24', titulo: 'La Maldición de Hill House', autor: 'Shirley Jackson', categoria: 'Terror psicológico', portada: 'la-maldicion-de-hill-house.jpg', ejemplaresDisponibles: 2 },
    { id: 'l25', titulo: 'El Resplandor', autor: 'Stephen King', categoria: 'Terror psicológico', portada: 'el-resplandor.jpg', ejemplaresDisponibles: 3 },
    { id: 'l26', titulo: 'Otra Vuelta de Tuerca', autor: 'Henry James', categoria: 'Terror psicológico', portada: 'otra-vuelta-de-tuerca.jpg', ejemplaresDisponibles: 1 },
    { id: 'l27', titulo: 'Siempre Hemos Vivido en el Castillo', autor: 'Shirley Jackson', categoria: 'Terror psicológico', portada: 'siempre-hemos-vivido-en-el-castillo.jpg', ejemplaresDisponibles: 0 },
    { id: 'l28', titulo: 'La Casa de los Espíritus', autor: 'Isabel Allende', categoria: 'Realismo mágico', portada: 'la-casa-de-los-espiritus.jpg', ejemplaresDisponibles: 4 },
    { id: 'l29', titulo: 'Pedro Páramo', autor: 'Juan Rulfo', categoria: 'Realismo mágico', portada: 'pedro-paramo.jpg', ejemplaresDisponibles: 2 },
    { id: 'l30', titulo: 'Como Agua para Chocolate', autor: 'Laura Esquivel', categoria: 'Realismo mágico', portada: 'como-agua-para-chocolate.jpg', ejemplaresDisponibles: 3 },
    { id: 'l31', titulo: 'El Túnel', autor: 'Ernesto Sabato', categoria: 'Realismo mágico', portada: 'el-tunel.jpg', ejemplaresDisponibles: 1 },
    { id: 'l32', titulo: 'American Gods', autor: 'Neil Gaiman', categoria: 'Fantasía oscura', portada: 'american-gods.jpg', ejemplaresDisponibles: 2 },
    { id: 'l33', titulo: 'Coraline', autor: 'Neil Gaiman', categoria: 'Fantasía oscura', portada: 'coraline.jpg', ejemplaresDisponibles: 3 },
    { id: 'l34', titulo: 'El Libro del Cementerio', autor: 'Neil Gaiman', categoria: 'Fantasía oscura', portada: 'el-libro-del-cementerio.jpg', ejemplaresDisponibles: 0 },
    { id: 'l35', titulo: 'Buenos Presagios', autor: 'Neil Gaiman y Terry Pratchett', categoria: 'Fantasía oscura', portada: 'buenos-presagios.jpg', ejemplaresDisponibles: 1 },
    { id: 'l36', titulo: 'It (Eso)', autor: 'Stephen King', categoria: 'Terror contemporáneo', portada: 'it-eso.jpg', ejemplaresDisponibles: 2 },
    { id: 'l37', titulo: 'La Feria de las Tinieblas', autor: 'Ray Bradbury', categoria: 'Terror contemporáneo', portada: 'la-feria-de-las-tinieblas.jpg', ejemplaresDisponibles: 4 },
    { id: 'l38', titulo: 'House of Leaves', autor: 'Mark Z. Danielewski', categoria: 'Terror contemporáneo', portada: 'house-of-leaves.jpg', ejemplaresDisponibles: 0 },
    { id: 'l39', titulo: 'La Casa', autor: 'Manuel Rivas', categoria: 'Terror contemporáneo', portada: 'la-casa.jpg', ejemplaresDisponibles: 1 },
    { id: 'l40', titulo: 'Orgullo y Prejuicio', autor: 'Jane Austen', categoria: 'Romance clásico', portada: 'orgullo-y-prejuicio.jpg', ejemplaresDisponibles: 3 },
    { id: 'l41', titulo: 'Cumbres Borrascosas', autor: 'Emily Brontë', categoria: 'Romance clásico', portada: 'cumbres-borrascosas.jpg', ejemplaresDisponibles: 2 },
    { id: 'l42', titulo: 'Jane Eyre', autor: 'Charlotte Brontë', categoria: 'Romance clásico', portada: 'jane-eyre.jpg', ejemplaresDisponibles: 4 },
    { id: 'l43', titulo: 'Ana Karenina', autor: 'León Tolstói', categoria: 'Romance clásico', portada: 'ana-karenina.jpg', ejemplaresDisponibles: 1 },
    { id: 'l44', titulo: 'Tres Hombres en una Barca', autor: 'Jerome K. Jerome', categoria: 'Humor clásico', portada: 'tres-hombres-en-una-barca.jpg', ejemplaresDisponibles: 2 },
    { id: 'l45', titulo: 'Las Aventuras de Mr. Pickwick', autor: 'Charles Dickens', categoria: 'Humor clásico', portada: 'las-aventuras-de-mr-pickwick.jpg', ejemplaresDisponibles: 0 },
    { id: 'l46', titulo: 'Cándido', autor: 'Voltaire', categoria: 'Humor clásico', portada: 'candido.jpg', ejemplaresDisponibles: 3 },
  ]);

  private readonly _prestamos = signal<Prestamo[]>([
    {
      id: 'p1',
      usuarioId: 'u1',
      libroId: 'l20',
      fechaPrestamo: sumarDias(hoyIso(), -10),
      fechaVencimiento: sumarDias(hoyIso(), 4),
      fechaDevolucion: null,
      estado: 'ACTIVO',
      diasRetraso: 0,
      montoMulta: 0,
    },
    {
      id: 'p2',
      usuarioId: 'u2',
      libroId: 'l28',
      fechaPrestamo: sumarDias(hoyIso(), -20),
      fechaVencimiento: sumarDias(hoyIso(), -6),
      fechaDevolucion: sumarDias(hoyIso(), -7),
      estado: 'DEVUELTO',
      diasRetraso: 0,
      montoMulta: 0,
    },
    {
      id: 'p3',
      usuarioId: 'u1',
      libroId: 'l25',
      fechaPrestamo: sumarDias(hoyIso(), -30),
      fechaVencimiento: sumarDias(hoyIso(), -16),
      fechaDevolucion: null,
      estado: 'VENCIDO',
      diasRetraso: 0,
      montoMulta: 0,
    },
    {
      id: 'p4',
      usuarioId: 'u3',
      libroId: 'l36',
      fechaPrestamo: sumarDias(hoyIso(), -25),
      fechaVencimiento: sumarDias(hoyIso(), -11),
      fechaDevolucion: sumarDias(hoyIso(), -5),
      estado: 'DEVUELTO',
      diasRetraso: 6,
      montoMulta: 90,
    },
  ]);

  readonly usuarios = this._usuarios.asReadonly();
  readonly libros = this._libros.asReadonly();
  readonly prestamos = this._prestamos.asReadonly();

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
        usuario.matricula.toLowerCase().includes(valor),
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
  registrarPrestamo(usuarioId: string, libroId: string, diasPlazo = 7): ResultadoRegistro {
    const usuario = this._usuarios().find((u) => u.id === usuarioId);
    const libro = this._libros().find((l) => l.id === libroId);

    if (!usuario) {
      return { ok: false, mensaje: 'Selecciona un usuario válido.' };
    }
    if (!libro) {
      return { ok: false, mensaje: 'Selecciona un libro válido.' };
    }
    if (usuario.estado !== 'ACTIVO') {
      return { ok: false, mensaje: `${usuario.nombre} no tiene una cuenta ACTIVA.` };
    }
    if (usuario.sancionesPendientes > 0) {
      return { ok: false, mensaje: `${usuario.nombre} tiene sanciones pendientes por resolver.` };
    }
    if (libro.ejemplaresDisponibles <= 0) {
      return { ok: false, mensaje: `No hay ejemplares disponibles de "${libro.titulo}".` };
    }

    const fechaPrestamo = hoyIso();
    const prestamo: Prestamo = {
      id: `p${crypto.randomUUID()}`,
      usuarioId,
      libroId,
      fechaPrestamo,
      fechaVencimiento: sumarDias(fechaPrestamo, diasPlazo),
      fechaDevolucion: null,
      estado: 'ACTIVO',
      diasRetraso: 0,
      montoMulta: 0,
    };

    this._prestamos.update((lista) => [prestamo, ...lista]);
    this._libros.update((lista) =>
      lista.map((l) => (l.id === libroId ? { ...l, ejemplaresDisponibles: l.ejemplaresDisponibles - 1 } : l)),
    );

    return { ok: true, mensaje: `Préstamo registrado para ${usuario.nombre}.`, prestamo };
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
        prestamo.usuario.matricula.toLowerCase().includes(valor) ||
        prestamo.libro.titulo.toLowerCase().includes(valor) ||
        prestamo.libro.autor.toLowerCase().includes(valor),
    );
  }

  /**
   * DE01/DE02 — Registra la devolución de un préstamo activo: actualiza su estado a DEVUELTO,
   * incrementa el stock del libro y, si detecta retraso, notifica al servicio de sanciones
   * (simulado) generando la multa correspondiente.
   */
  registrarDevolucion(prestamoId: string): ResultadoDevolucion {
    const prestamo = this._prestamos().find((p) => p.id === prestamoId);
    if (!prestamo) {
      return { ok: false, mensaje: 'Selecciona un préstamo válido.', tardia: false, diasRetraso: 0, montoMulta: 0 };
    }
    if (prestamo.estado !== 'ACTIVO' && prestamo.estado !== 'VENCIDO') {
      return { ok: false, mensaje: 'Este préstamo ya fue devuelto.', tardia: false, diasRetraso: 0, montoMulta: 0 };
    }

    const usuario = this._usuarios().find((u) => u.id === prestamo.usuarioId);
    const libro = this._libros().find((l) => l.id === prestamo.libroId);
    const fechaDevolucion = hoyIso();
    const diasRetraso = Math.max(0, diasEntre(prestamo.fechaVencimiento, fechaDevolucion));
    const tardia = diasRetraso > 0;
    const montoMulta = tardia ? diasRetraso * MULTA_POR_DIA_TARDIO : 0;

    this._prestamos.update((lista) =>
      lista.map((p) =>
        p.id === prestamoId
          ? { ...p, estado: 'DEVUELTO', fechaDevolucion, diasRetraso, montoMulta }
          : p,
      ),
    );
    this._libros.update((lista) =>
      lista.map((l) =>
        l.id === prestamo.libroId ? { ...l, ejemplaresDisponibles: l.ejemplaresDisponibles + 1 } : l,
      ),
    );
    if (tardia) {
      // Simula el aviso a sancion-service: se refleja como una sanción pendiente del usuario.
      this._usuarios.update((lista) =>
        lista.map((u) =>
          u.id === prestamo.usuarioId ? { ...u, sancionesPendientes: u.sancionesPendientes + 1 } : u,
        ),
      );
    }

    const mensaje = tardia
      ? `Devolución registrada con ${diasRetraso} día(s) de retraso. Se notificó al servicio de sanciones (multa de $${montoMulta}).`
      : `Devolución registrada a tiempo para ${usuario?.nombre ?? 'el usuario'}.`;

    return {
      ok: true,
      mensaje,
      tardia,
      diasRetraso,
      montoMulta,
      prestamo: { ...prestamo, estado: 'DEVUELTO', fechaDevolucion, diasRetraso, montoMulta },
    };
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
