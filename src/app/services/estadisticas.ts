import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface PrestamosPeriodo { fechaInicio: string; fechaFin: string; totalPrestamos: number; }
export interface LibroMasPrestado { libroId: string; titulo: string | null; isbn: string | null; totalPrestamos: number; }
export interface UsuarioMasSancionado { usuarioId: string; totalSanciones: number; }

@Injectable({ providedIn: 'root' })
export class EstadisticasService {
  private readonly http = inject(HttpClient);
  private readonly url = 'http://localhost:8080/api/estadisticas';
  prestamosPeriodo(fechaInicio: string, fechaFin: string): Observable<PrestamosPeriodo> {
    const params = new HttpParams().set('fechaInicio', fechaInicio).set('fechaFin', fechaFin);
    return this.http.get<PrestamosPeriodo>(`${this.url}/prestamos-periodo`, { params });
  }
  librosMasPrestados(limite = 10): Observable<LibroMasPrestado[]> {
    return this.http.get<LibroMasPrestado[]>(`${this.url}/libros-mas-prestados`, { params: new HttpParams().set('limite', limite) });
  }
  usuariosMasSancionados(limite = 10): Observable<UsuarioMasSancionado[]> {
    return this.http.get<UsuarioMasSancionado[]>(`${this.url}/usuarios-mas-sancionados`, { params: new HttpParams().set('limite', limite) });
  }
}
