// poses: true cuando el compañero tiene sus cinco poses en assets/avatars/poses
// (se generan con scripts/preparar_poses.py). Sin poses, se usa la imagen única.
export interface Avatar {
  id: string;
  nombre: string;
  animal: string;
  img: string;
  poses?: boolean;
  presentacion: string;  // cómo se presenta al crear la cuenta
}

export const AVATARES: Avatar[] = [
  { id: 'puma',      nombre: 'Pangipol', animal: 'Puma',               img: 'assets/avatars/puma.png', poses: true,
    presentacion: 'Soy Pangipol, el puma. Recorro la cordillera sin hacer ruido y sin apuro, y así vamos a aprender: paso a paso.' },
  { id: 'aguila',    nombre: 'Manketor', animal: 'Cóndor',             img: 'assets/avatars/aguila.png', poses: true,
    presentacion: 'Soy Manketor, el cóndor. Vuelo muy alto sobre los Andes, y desde arriba te ayudaré a ver lo lejos que llegas.' },
  { id: 'bandurria', nombre: 'Rakyfar',  animal: 'Bandurria',          img: 'assets/avatars/bandurria.png', poses: true,
    presentacion: 'Soy Rakyfar, la bandurria. Mi canto se escucha fuerte en el campo, ¡así que vamos a practicar con ganas!' },
  { id: 'monito',    nombre: 'Teutimos', animal: 'Monito del monte',   img: 'assets/avatars/monito.png', poses: true,
    presentacion: 'Soy Teutimos, el monito del monte. Vivo en los bosques del sur y soy chiquitito, pero muy curioso.' },
  { id: 'pudu',      nombre: 'Pudimel',  animal: 'Pudú',               img: 'assets/avatars/pudu.png', poses: true,
    presentacion: 'Soy Pudimel, el pudú, uno de los ciervos más pequeños del mundo. Pequeño pero valiente, como cada palabra nueva.' },
  { id: 'ranita',    nombre: 'Rinodar',  animal: 'Ranita de Darwin',   img: 'assets/avatars/ranita.png', poses: true,
    presentacion: 'Soy Rinodar, la ranita de Darwin. En mi especie los papás cuidan a sus crías en la garganta. ¡Así voy a cuidar tu aprendizaje!' }
];

export function imagenAvatar(id: string | null | undefined): string {
  const a = AVATARES.find(x => x.id === id);
  return a ? a.img : AVATARES[0].img;
}