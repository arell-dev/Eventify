import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { UsuarioDisponible } from './participante.model';
import { SeleccionarUsuario } from './seleccionar-usuario';

const recurso = '/api/participantes';
const disponibles = recurso + '/usuarios-disponibles';

const usuarios: UsuarioDisponible[] = [
  { id: 1, nombre: 'Sebastián Vargas Flores', correo: 'sebastian@example.test', carrera: 'Computación', rol: 'Estudiante' },
  { id: 2, nombre: 'Andrea Salazar Méndez', correo: 'andrea@example.test', carrera: 'Ingeniería de Software', rol: 'Estudiante' }
];

describe('SeleccionarUsuario', () => {
  let fixture: ComponentFixture<SeleccionarUsuario>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SeleccionarUsuario],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SeleccionarUsuario);
    http.expectOne({ url: disponibles, method: 'GET' }).flush(usuarios);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function radio(id: number): HTMLInputElement | null {
    return fixture.nativeElement.querySelector(`input[type="radio"][value="${id}"]`);
  }

  function confirmacion(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.acciones-formulario button');
  }

  it('busca por carrera, cambia el resumen y confirma únicamente el identificador del usuario elegido', () => {
    const navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    expect(radio(1)?.checked).toBeTrue();
    const buscador: HTMLInputElement = fixture.nativeElement.querySelector('#buscar-usuario');
    buscador.value = 'ingenieria';
    buscador.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(radio(1)).toBeNull();
    expect(confirmacion().disabled).toBeTrue();

    radio(2)?.click();
    fixture.detectChanges();
    const resumen: HTMLElement = fixture.nativeElement.querySelector('.datos-ficha');
    expect(resumen.textContent).toContain('Andrea Salazar Méndez');
    expect(resumen.textContent).toContain('andrea@example.test');

    confirmacion().click();
    const solicitud = http.expectOne({ url: recurso, method: 'POST' });
    expect(solicitud.request.body).toEqual({ usuarioId: 2 });
    solicitud.flush({ id: 12, usuarioId: 2, nombre: usuarios[1].nombre, correo: usuarios[1].correo, carrera: usuarios[1].carrera });
    expect(navegar).toHaveBeenCalledOnceWith(['/admin/participantes', 12]);
  });

  it('refresca los usuarios tras un conflicto sin seleccionar a otra persona', () => {
    confirmacion().click();
    http.expectOne({ url: recurso, method: 'POST' }).flush(
      { mensaje: 'El usuario ya está vinculado.' },
      { status: 409, statusText: 'Conflict' }
    );
    http.expectOne({ url: disponibles, method: 'GET' }).flush([usuarios[1]]);
    fixture.detectChanges();

    expect(radio(1)).toBeNull();
    expect(radio(2)?.checked).toBeFalse();
    expect(confirmacion().disabled).toBeTrue();
    const aviso: HTMLElement = fixture.nativeElement.querySelector('[role="alert"]');
    expect(aviso.textContent).toContain('El usuario ya está vinculado.');
  });
});
