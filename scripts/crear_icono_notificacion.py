#!/usr/bin/env python3
"""
Dibuja el ícono pequeño de las notificaciones de Android: el globo de diálogo
de Kimanke con la ü recortada, en blanco sobre fondo transparente. Android
pinta este ícono de un solo color, por eso no lleva colores.

Uso (desde la raíz del repositorio, con Pillow instalado y después de
`npx cap add android` o `npx cap sync android`):
    python3 scripts/crear_icono_notificacion.py

Escribe ic_stat_kimanke.png en las carpetas drawable de app-mapuzugun/android.
capacitor.config.ts ya le dice al plugin de notificaciones que use ese ícono.
"""
import os
from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'app-mapuzugun')
RES = os.path.join(RAIZ, 'android', 'app', 'src', 'main', 'res')
FUENTE = os.path.join(RAIZ, 'node_modules', '@fontsource', 'nunito', 'files', 'nunito-latin-900-normal.woff')
TAMANOS = {'mdpi': 24, 'hdpi': 36, 'xhdpi': 48, 'xxhdpi': 72, 'xxxhdpi': 96}
S = 384  # se dibuja grande y se achica, para que los bordes queden suaves


def dibujar():
    img = Image.new('L', (S, S), 0)
    d = ImageDraw.Draw(img)
    cx, cy, w, h = S / 2, S * 0.44, S * 0.86, S * 0.70
    x0, y0, x1, y1 = cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2
    d.rounded_rectangle([x0, y0, x1, y1], radius=S * 0.26, fill=255)
    d.polygon([(x0 + S * 0.16, y1 - S * 0.05), (x0 + S * 0.07, y1 + S * 0.17), (x0 + S * 0.36, y1 - S * 0.02)], fill=255)
    letra = ImageFont.truetype(FUENTE, int(S * 0.62))
    bb = d.textbbox((0, 0), 'ü', font=letra)
    d.text((cx - (bb[2] - bb[0]) / 2 - bb[0], cy - (bb[3] - bb[1]) / 2 - bb[1]), 'ü', font=letra, fill=0)
    blanco = Image.new('RGBA', (S, S), (255, 255, 255, 0))
    blanco.putalpha(img)
    return blanco


def main():
    if not os.path.exists(FUENTE):
        raise SystemExit('Falta la fuente Nunito. Corre primero: cd app-mapuzugun && npm install')
    if not os.path.isdir(RES):
        raise SystemExit('No está la carpeta android. Corre primero: cd app-mapuzugun && npx cap sync android')
    icono = dibujar()
    for densidad, lado in TAMANOS.items():
        carpeta = os.path.join(RES, f'drawable-{densidad}')
        os.makedirs(carpeta, exist_ok=True)
        icono.resize((lado, lado), Image.LANCZOS).save(os.path.join(carpeta, 'ic_stat_kimanke.png'))
    print('Listo: ic_stat_kimanke.png en', len(TAMANOS), 'carpetas drawable')


if __name__ == '__main__':
    main()
