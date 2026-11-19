#!/usr/bin/env python3
"""
Dibuja el ícono de Kimanke: un globo de diálogo crema con la ü,
sobre un degradado lago → maqui con la franja de colores.

Uso (desde la raíz del repositorio, con Pillow instalado):
    python3 scripts/crear_icono.py

Crea en app-mapuzugun/resources/ los archivos que usa capacitor-assets
(icon-only, icon-foreground, icon-background), actualiza el favicon y crea
los íconos de la versión web (pantalla de inicio de iPhone y Android).
Después: cd app-mapuzugun && npx capacitor-assets generate --android
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'app-mapuzugun')
RECURSOS = os.path.join(RAIZ, 'resources')
ICONOS_WEB = os.path.join(RAIZ, 'src', 'assets', 'icon')
FAVICON = os.path.join(ICONOS_WEB, 'favicon.png')
FUENTE = os.path.join(RAIZ, 'node_modules', '@fontsource', 'nunito', 'files', 'nunito-latin-900-normal.woff')

S = 1024
CREMA = (255, 244, 218)
LAGO = (29, 79, 191)
MAQUI = (91, 42, 134)
FRANJA = [(30, 125, 71), (255, 255, 255), (200, 48, 61), (255, 183, 3), (29, 79, 191), (91, 42, 134)]


def fondo():
    bg = Image.new('RGB', (S, S))
    d = ImageDraw.Draw(bg)
    for y in range(S):
        t = y / S
        d.line([(0, y), (S, y)], fill=tuple(int(LAGO[i] * (1 - t) + MAQUI[i] * t) for i in range(3)))
    y0, y1, w = int(S * 0.70), int(S * 0.80), S // 18
    for i in range(0, S, w):
        d.rectangle([i, y0, i + w, y1], fill=FRANJA[(i // w) % len(FRANJA)])
    return bg


def primer_plano():
    fg = Image.new('RGBA', (S, S))
    cx, cy, w, h = 512, 450, 470, 390
    x0, y0, x1, y1 = cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2
    sombra = Image.new('RGBA', (S, S))
    ImageDraw.Draw(sombra).rounded_rectangle([x0, y0 + 16, x1, y1 + 16], radius=150, fill=(20, 10, 40, 90))
    fg.alpha_composite(sombra.filter(ImageFilter.GaussianBlur(14)))
    d = ImageDraw.Draw(fg)
    d.rounded_rectangle([x0, y0, x1, y1], radius=150, fill=CREMA + (255,))
    d.polygon([(x0 + 90, y1 - 30), (x0 + 40, y1 + 95), (x0 + 200, y1 - 10)], fill=CREMA + (255,))
    letra = ImageFont.truetype(FUENTE, 330)
    bb = d.textbbox((0, 0), 'ü', font=letra)
    d.text((cx - (bb[2] - bb[0]) / 2 - bb[0], cy - (bb[3] - bb[1]) / 2 - bb[1]), 'ü', font=letra, fill=MAQUI)
    return fg


def main():
    if not os.path.exists(FUENTE):
        raise SystemExit('Falta la fuente Nunito. Corre primero: cd app-mapuzugun && npm install')
    os.makedirs(RECURSOS, exist_ok=True)
    bg, fg = fondo(), primer_plano()
    bg.save(os.path.join(RECURSOS, 'icon-background.png'), optimize=True)
    fg.save(os.path.join(RECURSOS, 'icon-foreground.png'), optimize=True)
    completo = bg.convert('RGBA')
    completo.alpha_composite(fg)
    completo.convert('RGB').save(os.path.join(RECURSOS, 'icon-only.png'), optimize=True)

    # Favicon: la zona visible del ícono, en círculo
    m = 171
    chico = completo.crop((m, m, S - m, S - m)).resize((128, 128), Image.LANCZOS)
    mascara = Image.new('L', (128, 128), 0)
    ImageDraw.Draw(mascara).ellipse([0, 0, 127, 127], fill=255)
    favicon = Image.new('RGBA', (128, 128))
    favicon.paste(chico, (0, 0), mascara)
    favicon.save(FAVICON, optimize=True)

    # Versión web: el sistema recorta las esquinas, así que van cuadrados y a sangre.
    # «maskable» deja margen de seguridad para Android, que puede recortarlo en círculo.
    visible = completo.crop((m, m, S - m, S - m)).convert('RGB')
    for lado, nombre in [(180, 'apple-touch-icon.png'), (192, 'icon-192.png'), (512, 'icon-512.png')]:
        visible.resize((lado, lado), Image.LANCZOS).save(os.path.join(ICONOS_WEB, nombre), optimize=True)
    completo.convert('RGB').resize((512, 512), Image.LANCZOS).save(
        os.path.join(ICONOS_WEB, 'icon-maskable-512.png'), optimize=True)
    print('Listo: resources/icon-*.png, favicon e íconos web actualizados.')


if __name__ == '__main__':
    main()
