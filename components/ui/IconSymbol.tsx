// Android und Web: SF-Symbol-Namen auf MaterialIcons abbilden. iOS nutzt IconSymbol.ios.tsx.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import React from 'react';
import { OpaqueColorValue, StyleProp, TextStyle } from 'react-native';

const MAPPING = {
  // MaterialIcons: https://icons.expo.fyi
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'sun.max.fill': 'wb-sunny',
  'list.bullet': 'format-list-bulleted',
  plus: 'add',
  minus: 'remove',
  xmark: 'close',
  scope: 'filter-center-focus',
  'shippingbox.fill': 'inventory-2',
  'paintbrush.fill': 'brush',
  'square.and.arrow.up': 'ios-share',
  checkmark: 'check',
  sparkles: 'auto-awesome',
  'lightbulb.fill': 'lightbulb',
  lightbulb: 'lightbulb-outline',
  'slider.horizontal.3': 'tune',
  'water.waves': 'waves',
  'globe.europe.africa.fill': 'public',
  'star.fill': 'star',
  'circle.dotted': 'blur-circular',
  'circle.dashed': 'trip-origin',
  'cloud.fill': 'cloud',
  'moon.stars.fill': 'nights-stay',
  'play.fill': 'play-arrow',
  'pause.fill': 'pause',
  'sun.max': 'wb-sunny',
  shippingbox: 'inventory-2',
  'moon.stars': 'nights-stay',
  book: 'menu-book',
  'book.fill': 'menu-book',
  'arrow.up.right': 'north-east',
} as Partial<
  Record<
    import('expo-symbols').SymbolViewProps['name'],
    React.ComponentProps<typeof MaterialIcons>['name']
  >
>;

export type IconSymbolName = keyof typeof MAPPING;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
