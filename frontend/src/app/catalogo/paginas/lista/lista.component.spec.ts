import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EMPTY } from 'rxjs';
import { CambiosInscripcionesService } from '../../../comunes/inscripciones/cambios-inscripciones.service';
import { EventoPublico } from '../../modelos/catalogo.model';
import { CatalogoListaComponent } from './lista.component';

describe('Catálogo de eventos', () => {
  it('identifica el evento asignado y ofrece inscribirse en otro evento disponible', () => {
    TestBed.configureTestingModule({
      imports: [CatalogoListaComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CambiosInscripcionesService, useValue: { cambios: EMPTY } }
      ]
    });

    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CatalogoListaComponent);
    const ahora = Date.now();
    const eventoAsignado: EventoPublico = {
      id: 1,
      titulo: 'Taller asignado',
      descripcion: 'Contenido del taller',
      tipo: 'TALLER',
      modalidad: 'PRESENCIAL',
      lugar: 'UTP',
      enlace: '',
      inicio: new Date(ahora + 86_400_000).toISOString(),
      fin: new Date(ahora + 90_000_000).toISOString(),
      nombrePonente: 'Ponente de prueba',
      cupo: 20,
      cuposDisponibles: 20
    };

    http.expectOne('/api/publico/eventos').flush([
      eventoAsignado,
      { ...eventoAsignado, id: 2, titulo: 'Otro taller' }
    ]);
    http.expectOne('/api/sesion').flush({
      usuario: 'ponente@example.com',
      rol: 'USUARIO',
      perfil: { id: 10, nombre: 'Ponente de prueba', correo: 'ponente@example.com' }
    });
    fixture.detectChanges();

    const pagina: HTMLElement = fixture.nativeElement;
    expect(pagina.querySelector('article')).toBeNull();

    http.expectOne('/api/publico/mis-inscripciones').flush({ eventoIds: [], eventosComoPonenteIds: [1] });
    fixture.detectChanges();
    http.expectOne('/api/notificaciones').flush([]);

    const enlaceAsignado = pagina.querySelector('article a[href="/eventos/1"]');
    const enlaceOtro = pagina.querySelector('article a[href="/eventos/2"]');
    expect(enlaceAsignado?.closest('article')?.textContent).toContain('Eres el ponente de este evento');
    expect(enlaceAsignado?.textContent?.trim()).toBe('Ver detalle');
    expect(enlaceOtro?.textContent?.trim()).toBe('Inscribirme');
    http.verify();
  });
});
