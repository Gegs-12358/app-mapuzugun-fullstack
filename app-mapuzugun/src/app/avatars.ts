// poses: true cuando el compañero tiene sus cinco poses en assets/avatars/poses
// (se generan con scripts/preparar_poses.py). Sin poses, se usa la imagen única.
export interface Avatar {
  id: string;
  nombre: string;
  animal: string;
  img: string;
  poses?: boolean;
}

export const AVATARES: Avatar[] = [
  { id: 'puma',      nombre: 'Pangipol', animal: 'Puma',               img: 'assets/avatars/puma.png' },
  { id: 'aguila',    nombre: 'Manketor', animal: 'Cóndor',             img: 'assets/avatars/aguila.png' },
  { id: 'bandurria', nombre: 'Rakyfar',  animal: 'Bandurria',          img: 'assets/avatars/bandurria.png' },
  { id: 'monito',    nombre: 'Teutimos', animal: 'Monito del monte',   img: 'assets/avatars/monito.png' },
  { id: 'pudu',      nombre: 'Pudimel',  animal: 'Pudú',               img: 'assets/avatars/pudu.png', poses: true },
  { id: 'ranita',    nombre: 'Rinodar',  animal: 'Ranita de Darwin',   img: 'assets/avatars/ranita.png', poses: true }
];

export function imagenAvatar(id: string | null | undefined): string {
  const a = AVATARES.find(x => x.id === id);
  return a ? a.img : AVATARES[0].img;
}