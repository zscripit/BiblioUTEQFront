import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // La portada post-sesión depende del estado del usuario: se renderiza en el cliente.
    path: 'home',
    renderMode: RenderMode.Client,
  },
  {
    // El catálogo también depende de la sesión (misma razón que /home).
    path: 'catalogo',
    renderMode: RenderMode.Client,
  },
  {
    // Panel del bibliotecario (préstamos y devoluciones): también depende de la sesión.
    path: 'bibliotecario',
    renderMode: RenderMode.Client,
  },
  {
    path: 'bibliotecario/**',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
