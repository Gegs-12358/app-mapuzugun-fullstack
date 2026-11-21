import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './app/auth.interceptor';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { aplicarAccesibilidad } from './app/accesibilidad';

// Tamaño de letra y menos movimiento, antes de dibujar la app
aplicarAccesibilidad();

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({ animated: false, mode: 'md' }),  // mismo estilo en Android, iPhone y navegador
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([authInterceptor]))
  ],
});