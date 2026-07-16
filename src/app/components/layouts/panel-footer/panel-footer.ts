import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Footer del área autenticada, compartido por Home, Catálogo, Mis reservas y Mis préstamos. */
@Component({
  selector: 'app-panel-footer',
  imports: [RouterLink],
  templateUrl: './panel-footer.html',
  styleUrl: './panel-footer.scss',
})
export class PanelFooter {
  protected readonly anioActual = new Date().getFullYear();
}
