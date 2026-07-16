import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

export interface Usuario { id: string; nombre: string; correo: string; roles: string[]; }
interface TokenResponse { access_token: string; refresh_token?: string; id_token?: string; expires_in: number; }

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly gateway = 'http://localhost:8080';
  private readonly clientId = 'bibliouteq-spa';
  private readonly redirectUri = 'http://localhost:4200/auth/callback';
  private readonly _usuario = signal<Usuario | null>(this.leerUsuario());

  readonly usuario = this._usuario.asReadonly();
  readonly estaAutenticado = computed(() => this._usuario() !== null);

  async iniciarSesion(returnUrl = '/home'): Promise<void> {
    if (!this.esNavegador()) return;
    const verifier = this.base64Url(crypto.getRandomValues(new Uint8Array(64)));
    const state = this.base64Url(crypto.getRandomValues(new Uint8Array(32)));
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    sessionStorage.setItem('oauth_code_verifier', verifier);
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('oauth_return_url', returnUrl.startsWith('/') ? returnUrl : '/home');
    const params = new URLSearchParams({
      response_type: 'code', client_id: this.clientId, redirect_uri: this.redirectUri,
      scope: 'openid profile read write', state,
      // Obliga al Authorization Server a crear un login nuevo; evita reutilizar
      // un formulario con el CSRF de la sesion que acaba de cerrarse.
      prompt: 'login',
      code_challenge: this.base64Url(new Uint8Array(digest)), code_challenge_method: 'S256',
    });
    window.location.assign(`${this.gateway}/oauth2/authorize?${params}`);
  }

  async completarInicioSesion(code: string, state: string): Promise<void> {
    const verifier = sessionStorage.getItem('oauth_code_verifier');
    if (!verifier || state !== sessionStorage.getItem('oauth_state')) {
      throw new Error('La respuesta de autenticacion no es valida. Intenta nuevamente.');
    }
    const body = new URLSearchParams({
      grant_type: 'authorization_code', client_id: this.clientId,
      redirect_uri: this.redirectUri, code, code_verifier: verifier,
    });
    const response = await fetch(`${this.gateway}/oauth2/token`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
    });
    if (!response.ok) throw new Error('No fue posible obtener la sesion.');
    const tokens = (await response.json()) as TokenResponse;
    sessionStorage.removeItem('oauth_code_verifier');
    sessionStorage.removeItem('oauth_state');
    sessionStorage.setItem('oauth_tokens', JSON.stringify(tokens));
    const claims = this.decodificarJwt(tokens.id_token ?? tokens.access_token);
    const accessClaims = this.decodificarJwt(tokens.access_token);
    const correo = String(claims['email'] ?? claims['sub'] ?? 'usuario');
    const roles = Array.isArray(accessClaims['roles'])
      ? accessClaims['roles'].map(String)
      : [];
    const id = String(accessClaims['user_id'] ?? claims['user_id'] ?? '');
    const usuario = { id, nombre: String(claims['name'] ?? this.nombreDesdeCorreo(correo)), correo, roles };
    sessionStorage.setItem('oauth_usuario', JSON.stringify(usuario));
    this._usuario.set(usuario);
  }

  accessToken(): string | null {
    if (!this.esNavegador()) return null;
    const raw = sessionStorage.getItem('oauth_tokens');
    return raw ? (JSON.parse(raw) as TokenResponse).access_token : null;
  }

  cerrarSesion(): void {
    let idToken: string | undefined;
    if (this.esNavegador()) {
      const raw = sessionStorage.getItem('oauth_tokens');
      idToken = raw ? (JSON.parse(raw) as TokenResponse).id_token : undefined;
      sessionStorage.removeItem('oauth_tokens');
      sessionStorage.removeItem('oauth_usuario');
      sessionStorage.removeItem('oauth_code_verifier');
      sessionStorage.removeItem('oauth_state');
    }
    this._usuario.set(null);

    if (this.esNavegador() && idToken) {
      const params = new URLSearchParams({
        id_token_hint: idToken,
        post_logout_redirect_uri: 'http://localhost:4200/',
      });
      // replace elimina la pagina autenticada del historial para no volver a un
      // formulario o callback ligado a la sesion invalidada.
      window.location.replace(`${this.gateway}/connect/logout?${params}`);
    } else if (this.esNavegador()) {
      window.location.assign('/');
    }
  }

  tieneTokenValido(): boolean {
    const token = this.accessToken();
    if (!token) return false;
    try {
      const exp = Number(this.decodificarJwt(token)['exp']);
      if (!Number.isFinite(exp) || exp * 1000 <= Date.now()) {
        sessionStorage.removeItem('oauth_tokens');
        sessionStorage.removeItem('oauth_usuario');
        this._usuario.set(null);
        return false;
      }
      return true;
    } catch {
      sessionStorage.removeItem('oauth_tokens');
      sessionStorage.removeItem('oauth_usuario');
      this._usuario.set(null);
      return false;
    }
  }

  tieneRol(rol: string): boolean {
    return this.tieneTokenValido() && (this._usuario()?.roles ?? []).includes(rol);
  }

  private leerUsuario(): Usuario | null {
    if (!this.esNavegador()) return null;
    const raw = sessionStorage.getItem('oauth_usuario');
    return raw ? (JSON.parse(raw) as Usuario) : null;
  }
  private esNavegador(): boolean { return isPlatformBrowser(this.platformId); }
  private base64Url(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  private decodificarJwt(token: string): Record<string, unknown> {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload), c => c.charCodeAt(0))));
  }
  private nombreDesdeCorreo(correo: string): string {
    return (correo.split('@')[0] || 'Usuario').split(/[._-]+/).filter(Boolean)
      .map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  }
}
