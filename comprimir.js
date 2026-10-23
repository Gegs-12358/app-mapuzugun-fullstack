const sharp = require('sharp');
const fs = require('fs');
const dir = 'D:/INGENIERIA_EN_INFORMATICA/programacion_movil/mapuche/app-mapuzugun/src/assets/';
const files = ['bg/intro.webp', 'bg/leccion.webp', 'bg/login.webp', 'bg/mapa.webp', 'img/portada.webp'];

(async () => {
  for (const f of files) {
    const buf = await sharp(dir + f)
      .resize({ width: 1080, withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();
    fs.writeFileSync(dir + f, buf);
    console.log(f, Math.round(buf.length / 1024) + ' KB');
  }
})();
