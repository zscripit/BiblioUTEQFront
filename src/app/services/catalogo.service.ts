import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface Libro {
  id: string;
  titulo: string;
  isbn: string;
  autor: string;
  categoria: string;
  stock: number;
  stockReservado: number;
  activo: boolean;
  tienePortada: boolean;
}

export interface LibroForm {
  titulo: string;
  isbn: string;
  autor: string;
  categoria: string;
  stock: number;
}

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/catalogo';

  listar(busqueda?: string, categoria?: string): Observable<Libro[]> {
    let params = new HttpParams();
    if (busqueda) params = params.set('busqueda', busqueda);
    if (categoria) params = params.set('categoria', categoria);
    return this.http.get<Libro[]>(this.API_URL, { params });
  }

  categorias(): Observable<string[]> {
    return this.http.get<string[]>(`${this.API_URL}/categorias`);
  }

  obtener(id: string): Observable<Libro> {
    return this.http.get<Libro>(`${this.API_URL}/${id}`);
  }

  crear(libro: LibroForm): Observable<Libro> {
    return this.http.post<Libro>(this.API_URL, libro);
  }

  actualizar(id: string, libro: LibroForm): Observable<Libro> {
    return this.http.put<Libro>(`${this.API_URL}/${id}`, libro);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }

  /** Solo acepta PNG; el backend valida la firma binaria del archivo. */
  subirPortada(id: string, archivo: File): Observable<Libro> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<Libro>(`${this.API_URL}/${id}/portada`, formData);
  }

  portadaUrl(id: string): string {
    return `${this.API_URL}/${id}/portada`;
  }
}
