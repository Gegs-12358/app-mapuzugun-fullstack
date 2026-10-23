export const AVATARES = [
  { id: 'puma',      nombre: 'Pangipol', animal: 'Puma',             img: 'assets/avatars/puma.png' },
  { id: 'aguila',    nombre: 'Manketor', animal: 'Cóndor',           img: 'assets/avatars/aguila.png' },
  { id: 'bandurria', nombre: 'Rakyfar',  animal: 'Bandurria',        img: 'assets/avatars/bandurria.png' },
  { id: 'monito',    nombre: 'Teutimos', animal: 'Monito del monte', img: 'assets/avatars/monito.png' }
];

export function imagenAvatar(id: string | null | undefined): string {
  const a = AVATARES.find(x => x.id === id);
  return a ? a.img : AVATARES[0].img;
}