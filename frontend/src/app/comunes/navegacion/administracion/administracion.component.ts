import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MenuAdministracionComponent } from '../menu-administracion/menu-administracion.component';

@Component({
  selector: 'app-administracion',
  imports: [MenuAdministracionComponent, RouterOutlet],
  templateUrl: './administracion.html',
  styleUrl: './administracion.css'
})
// Comparte la navegación y conserva el contenido del módulo activo.
export class AdministracionComponent {
}
