import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrestamosService } from '../../prestamos/prestamos.service';

@Component({
  selector: 'app-sanciones-admin',
  imports: [FormsModule],
  templateUrl: './sanciones.html',
  styleUrl: './sanciones.scss',
})
export class SancionesAdmin {
  private readonly prestamosService = inject(PrestamosService);

  protected readonly buscarUsuario = signal('');
  protected readonly filtroEstado = signal<'TODAS' | 'PENDIENTE' | 'PAGADA'>('PENDIENTE');

  protected readonly sancionesFiltradas = computed(() => {
    const termino = this.buscarUsuario().trim().toLowerCase();
    const estado = this.filtroEstado();
    
    const prestamos = this.prestamosService.historialDetallado();
    
    return this.prestamosService.sanciones().filter((s) => {
      if (estado !== 'TODAS' && s.estado !== estado) {
        return false;
      }
      
      const pDetalle = prestamos.find((p) => p.id === s.prestamoId);
      if (!pDetalle) return false;
      
      if (!termino) return true;
      
      return (
        pDetalle.usuario.nombre.toLowerCase().includes(termino) ||
        pDetalle.usuario.matricula.toLowerCase().includes(termino) ||
        pDetalle.libro.titulo.toLowerCase().includes(termino)
      );
    }).map((s) => {
      const pDetalle = prestamos.find((p) => p.id === s.prestamoId)!;
      return {
        ...s,
        usuario: pDetalle.usuario,
        libro: pDetalle.libro,
        fechaVencimiento: pDetalle.fechaVencimiento
      };
    });
  });

  pagar(id: string): void {
    this.prestamosService.pagarSancion(id);
  }
}
