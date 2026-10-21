export const AVATARES = [
  { id: 'puma',      nombre: 'Puma',             img: 'assets/avatars/puma.png' },
  { id: 'aguila',    nombre: 'Águila',           img: 'assets/avatars/aguila.png' },
  { id: 'bandurria', nombre: 'Bandurria',        img: 'assets/avatars/bandurria.png' },
  { id: 'monito',    nombre: 'Monito del monte', img: 'assets/avatars/monito.png' }
];

export function imagenAvatar(id: string | null | undefined): string {
  const a = AVATARES.find(x => x.id === id);
  return a ? a.img : AVATARES[0].img;
}