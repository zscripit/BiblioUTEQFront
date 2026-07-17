import { Routes } from '@angular/router';
import { authGuard } from './services/auth-guard';
import { adminGuard } from './services/admin-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/main/main').then((m) => m.Main),
    children: [
      {
        path: '',
        loadComponent: () => import('./Landing/inicio/inicio').then((m) => m.Inicio),
        title: 'Biblioteca UTEQ | Inicio',
      },
      {
        path: 'sobre-nosotros',
        loadComponent: () =>
          import('./Landing/sobrenosotros/sobrenosotros').then((m) => m.Sobrenosotros),
        title: 'Biblioteca UTEQ | Sobre Nosotros',
      },
      {
        path: 'contactos',
        loadComponent: () => import('./Landing/contactos/contactos').then((m) => m.Contactos),
        title: 'Biblioteca UTEQ | Contactos',
      },
      {
        path: 'politicas',
        loadComponent: () => import('./Landing/politicas/politicas').then((m) => m.Politicas),
        title: 'Biblioteca UTEQ | Políticas de Uso',
      },
      {
        path: 'admin/usuarios',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/usuarios/usuarios').then((m) => m.UsuariosAdminComponent),
        title: 'Biblioteca UTEQ | Gestion de usuarios',
      },
      {
        path: 'admin/libros',
        canActivate: [authGuard],
        loadComponent: () => import('./features/admin/libros/libros').then((m) => m.LibrosAdmin),
        title: 'Biblioteca UTEQ | Gestión de libros',
      },
      {
        path: 'admin/estadisticas',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/estadisticas/estadisticas').then((m) => m.EstadisticasAdmin),
        title: 'Biblioteca UTEQ | Estadisticas',
      },
    ],
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./features/auth/callback/callback').then((m) => m.AuthCallback),
    title: 'Biblioteca UTEQ | Autenticando',
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
    title: 'Biblioteca UTEQ | Iniciar Sesión',
  },
  {
    path: 'registro',
    loadComponent: () => import('./features/auth/registre/registre').then((m) => m.Registre),
    title: 'Biblioteca UTEQ | Crear Cuenta',
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
    title: 'Biblioteca UTEQ | Mi Biblioteca',
  },
  {
    path: 'perfil',
    canActivate: [authGuard],
    loadComponent: () => import('./features/perfil/perfil').then((m) => m.Perfil),
    title: 'Biblioteca UTEQ | Mi perfil',
  },
  {
    path: 'catalogo',
    canActivate: [authGuard],
    loadComponent: () => import('./features/catalogo/catalogo').then((m) => m.Catalogo),
    title: 'Biblioteca UTEQ | Catálogo',
  },
  {
    path: 'mis-reservas',
    canActivate: [authGuard],
    loadComponent: () => import('./features/reservas/mis-reservas/mis-reservas').then((m) => m.MisReservas),
    title: 'Biblioteca UTEQ | Mis reservas',
  },
  {
    path: 'mis-prestamos',
    canActivate: [authGuard],
    loadComponent: () => import('./features/prestamos/mis-prestamos/mis-prestamos').then((m) => m.MisPrestamos),
    title: 'Biblioteca UTEQ | Mis préstamos',
  },
  {
    path: 'historial',
    canActivate: [authGuard],
    loadComponent: () => import('./features/historial/historial').then((m) => m.Historial),
    title: 'Biblioteca UTEQ | Historial',
  },
  {
    // Panel del bibliotecario (EPIC05 préstamos + EPIC06 devoluciones)
    path: 'bibliotecario',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/prestamos/panel-prestamos/panel-prestamos').then(
        (m) => m.PanelPrestamos,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/prestamos/panel-inicio/panel-inicio').then((m) => m.PanelInicio),
        title: 'Biblioteca UTEQ | Panel de bibliotecario',
      },
      {
        path: 'prestamos',
        children: [
          { path: '', redirectTo: 'registrar', pathMatch: 'full' },
          {
            path: 'registrar',
            loadComponent: () =>
              import('./features/prestamos/registrar-prestamo/registrar-prestamo').then(
                (m) => m.RegistrarPrestamo,
              ),
            title: 'Biblioteca UTEQ | Registrar préstamo',
          },
          {
            path: 'activos',
            loadComponent: () =>
              import('./features/prestamos/prestamos-activos/prestamos-activos').then(
                (m) => m.PrestamosActivos,
              ),
            title: 'Biblioteca UTEQ | Préstamos activos',
          },
          {
            path: 'historial',
            loadComponent: () =>
              import('./features/prestamos/historial-prestamos/historial-prestamos').then(
                (m) => m.HistorialPrestamos,
              ),
            title: 'Biblioteca UTEQ | Historial de préstamos',
          },
        ],
      },
      {
        path: 'devoluciones',
        children: [
          { path: '', redirectTo: 'registrar', pathMatch: 'full' },
          {
            path: 'registrar',
            loadComponent: () =>
              import('./features/devoluciones/registrar-devolucion/registrar-devolucion').then(
                (m) => m.RegistrarDevolucion,
              ),
            title: 'Biblioteca UTEQ | Registrar devolución',
          },
          {
            path: 'historial',
            loadComponent: () =>
              import(
                './features/devoluciones/historial-devoluciones/historial-devoluciones'
              ).then((m) => m.HistorialDevoluciones),
            title: 'Biblioteca UTEQ | Historial de devoluciones',
          },
          {
            path: 'sanciones',
            loadComponent: () =>
              import(
                './features/devoluciones/sanciones/sanciones'
              ).then((m) => m.SancionesAdmin),
            title: 'Biblioteca UTEQ | Administrar sanciones',
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
