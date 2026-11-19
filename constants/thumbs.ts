/**
 * Stillbilder für die Planetenliste. Einmal aus der 3D-Szene gerendert
 * (transparenter Hintergrund, 192 px), damit die Liste keine GL-Ansichten braucht.
 */
export const thumbs: Record<string, number> = {
  sonne: require('@/assets/planets/sonne.png'),
  merkur: require('@/assets/planets/merkur.png'),
  venus: require('@/assets/planets/venus.png'),
  erde: require('@/assets/planets/erde.png'),
  mars: require('@/assets/planets/mars.png'),
  jupiter: require('@/assets/planets/jupiter.png'),
  saturn: require('@/assets/planets/saturn.png'),
  uranus: require('@/assets/planets/uranus.png'),
  neptun: require('@/assets/planets/neptun.png'),
};
