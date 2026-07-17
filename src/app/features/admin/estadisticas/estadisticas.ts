import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, forkJoin } from 'rxjs';
import { EstadisticasService, LibroMasPrestado, PrestamosPeriodo, UsuarioMasSancionado } from '../../../services/estadisticas';
import { UsuarioAdmin, UsuariosAdminService } from '../../../services/usuarios-admin';

interface UsuarioSancionadoVista extends UsuarioMasSancionado { nombre: string; email: string; activo: boolean | null; }

@Component({ selector: 'app-estadisticas-admin', imports: [FormsModule], templateUrl: './estadisticas.html', styleUrl: './estadisticas.scss' })
export class EstadisticasAdmin implements OnInit {
  private readonly estadisticasService = inject(EstadisticasService);
  private readonly usuariosService = inject(UsuariosAdminService);
  protected readonly cargando = signal(true);
  protected readonly consultandoPeriodo = signal(false);
  protected readonly error = signal('');
  protected readonly periodo = signal<PrestamosPeriodo | null>(null);
  protected readonly libros = signal<LibroMasPrestado[]>([]);
  protected readonly usuariosSancionados = signal<UsuarioSancionadoVista[]>([]);
  protected fechaInicio = this.primerDiaDelMes();
  protected fechaFin = this.fechaActual();
  protected readonly maxPrestamosLibro = computed(() => Math.max(1, ...this.libros().map((libro) => libro.totalPrestamos)));
  protected readonly maxSanciones = computed(() => Math.max(1, ...this.usuariosSancionados().map((usuario) => usuario.totalSanciones)));

  async ngOnInit(): Promise<void> {
    try {
      const resultado = await firstValueFrom(forkJoin({
        periodo: this.estadisticasService.prestamosPeriodo(this.fechaInicio, this.fechaFin),
        libros: this.estadisticasService.librosMasPrestados(),
        sancionados: this.estadisticasService.usuariosMasSancionados(),
        usuarios: this.usuariosService.listar(),
      }));
      this.periodo.set(resultado.periodo);
      this.libros.set(resultado.libros);
      this.usuariosSancionados.set(this.mapearUsuarios(resultado.sancionados, resultado.usuarios));
    } catch (error) { this.error.set(this.mensajeError(error)); }
    finally { this.cargando.set(false); }
  }

  protected async consultarPeriodo(): Promise<void> {
    if (this.consultandoPeriodo()) return;
    this.error.set('');
    if (!this.fechaInicio || !this.fechaFin) { this.error.set('Selecciona ambas fechas.'); return; }
    if (this.fechaInicio > this.fechaFin) { this.error.set('La fecha inicial no puede ser mayor que la fecha final.'); return; }
    this.consultandoPeriodo.set(true);
    try { this.periodo.set(await firstValueFrom(this.estadisticasService.prestamosPeriodo(this.fechaInicio, this.fechaFin))); }
    catch (error) { this.error.set(this.mensajeError(error)); }
    finally { this.consultandoPeriodo.set(false); }
  }

  protected ancho(valor: number, maximo: number): string { return `${Math.max(4, (valor / maximo) * 100)}%`; }
  private mapearUsuarios(ranking: UsuarioMasSancionado[], usuarios: UsuarioAdmin[]): UsuarioSancionadoVista[] {
    const porId = new Map(usuarios.map((usuario) => [usuario.id, usuario]));
    return ranking.map((item) => { const usuario = porId.get(item.usuarioId); return { ...item, nombre: usuario?.nombreCompleto ?? 'Usuario no disponible', email: usuario?.email ?? item.usuarioId, activo: usuario?.activo ?? null }; });
  }
  private mensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 403) return 'No tienes permisos para consultar las estadisticas.';
      return String(error.error?.error ?? error.error?.message ?? 'No fue posible cargar las estadisticas.');
    }
    return 'No fue posible cargar las estadisticas.';
  }
  private fechaActual(): string { return new Date().toISOString().slice(0, 10); }
  private primerDiaDelMes(): string { const fecha = new Date(); return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-01`; }
}
