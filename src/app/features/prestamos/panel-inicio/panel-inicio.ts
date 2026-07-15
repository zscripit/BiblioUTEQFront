import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

type Icono = 'mas' | 'usuario' | 'reloj' | 'check';

interface AccesoRapido {
  ruta: string;
  titulo: string;
  descripcion: string;
  icono: Icono;
}

interface GrupoAccesos {
  titulo: string;
  accesos: AccesoRapido[];
}

@Component({
  selector: 'app-panel-inicio',
  imports: [RouterLink],
  templateUrl: './panel-inicio.html',
  styleUrl: './panel-inicio.scss',
})
export class PanelInicio {
  protected readonly grupos: GrupoAccesos[] = [
    {
      titulo: 'Préstamos',
      accesos: [
        {
          ruta: '/bibliotecario/prestamos/registrar',
          titulo: 'Registrar préstamo',
          descripcion: 'Formaliza la entrega de un libro a un usuario ACTIVO y sin sanciones.',
          icono: 'mas',
        },
        {
          ruta: '/bibliotecario/prestamos/activos',
          titulo: 'Préstamos activos',
          descripcion: 'Consulta qué libros tiene en su poder un usuario y cuándo vencen.',
          icono: 'usuario',
        },
        {
          ruta: '/bibliotecario/prestamos/historial',
          titulo: 'Historial de préstamos',
          descripcion: 'Trazabilidad completa, filtrable por usuario o fecha.',
          icono: 'reloj',
        },
      ],
    },
    {
      titulo: 'Devoluciones',
      accesos: [
        {
          ruta: '/bibliotecario/devoluciones/registrar',
          titulo: 'Registrar devolución',
          descripcion: 'Actualiza el préstamo a DEVUELTO y detecta retrasos automáticamente.',
          icono: 'check',
        },
        {
          ruta: '/bibliotecario/devoluciones/historial',
          titulo: 'Historial de devoluciones',
          descripcion: 'Consulta las devoluciones realizadas, con o sin retraso.',
          icono: 'reloj',
        },
      ],
    },
  ];
}
