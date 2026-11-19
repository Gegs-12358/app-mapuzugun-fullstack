#!/usr/bin/env python3
"""
Prepara las poses de un compañero para la app.

Toma las cinco imágenes PNG con fondo transparente (exportadas desde Canva),
las recorta con el MISMO encuadre para que no "salten" al cambiar de pose,
las achica a 512x512 y las guarda como WebP livianos en
app-mapuzugun/src/assets/avatars/poses/<animal>-<pose>.webp

Uso (desde la carpeta del proyecto):
    python3 scripts/preparar_poses.py pudu \\
        sentado.png ojos_cerrados.png sonriendo.png saltando.png saludando.png

El orden de las imágenes importa: sentado, ojos cerrados, feliz, saltando, saludando.
Necesita Pillow:  sudo apt install python3-pil   (o  pip install pillow)
"""
import os
import sys

from PIL import Image

POSES = ['sentado', 'ojos-cerrados', 'feliz', 'saltando', 'saludando']
LADO_FINAL = 512  # nítido a 150 px en pantallas de alta densidad
MARGEN = 30  # píxeles de aire alrededor, en la imagen original


def main():
    if len(sys.argv) != 2 + len(POSES):
        print(__doc__)
        sys.exit(1)

    animal = sys.argv[1]
    archivos = sys.argv[2:]
    imagenes = [Image.open(a).convert('RGBA') for a in archivos]

    tamanos = {im.size for im in imagenes}
    if len(tamanos) != 1:
        print('Aviso: las imágenes no tienen el mismo tamaño:', tamanos)
        print('Se ajustan al tamaño de la primera, pero puede notarse un salto al cambiar de pose.')
        imagenes = [im.resize(imagenes[0].size, Image.LANCZOS) for im in imagenes]

    # Caja que contiene a todas las poses: el mismo recorte para todas
    cajas = [im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox() for im in imagenes]
    if any(c is None for c in cajas):
        print('Alguna imagen está vacía o no tiene fondo transparente.')
        sys.exit(1)
    x0 = min(c[0] for c in cajas)
    y0 = min(c[1] for c in cajas)
    x1 = max(c[2] for c in cajas)
    y1 = max(c[3] for c in cajas)
    lado = max(x1 - x0, y1 - y0) + 2 * MARGEN
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    caja = (cx - lado // 2, cy - lado // 2, cx - lado // 2 + lado, cy - lado // 2 + lado)

    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    destino = os.path.join(raiz, 'app-mapuzugun', 'src', 'assets', 'avatars', 'poses')
    os.makedirs(destino, exist_ok=True)

    for pose, im in zip(POSES, imagenes):
        salida = os.path.join(destino, f'{animal}-{pose}.webp')
        im.crop(caja).resize((LADO_FINAL, LADO_FINAL), Image.LANCZOS).save(
            salida, 'WEBP', quality=86, method=6)
        print(f'{salida}  ({os.path.getsize(salida) // 1024} KB)')

    print(f'\nListo. Ahora marca "{animal}" con poses: true en app-mapuzugun/src/app/avatars.ts')


if __name__ == '__main__':
    main()
