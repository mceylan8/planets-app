import React, { useRef } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  withTiming,
} from 'react-native-reanimated';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 35,
    paddingTop: 20
  },
  planetContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  planetImage: {
    height: 150,
    width: 150,
    resizeMode: 'contain',
    justifyContent: 'center',
    marginBottom: 8,
  },
  headerImage: {
    height: 250,
    width: '100%',
    resizeMode: 'cover',
  },
  titleContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17, 0, 249, 0.5)', // Leicht dunkler Hintergrund
  },
});

const planets = [
  {
    name: 'Mercury',
    description: 'The smallest planet and closest to the Sun.',
    diameter: '4,880 km',
    orbitTime: '88 days',
    moons: 0,
    image: require('@/assets/images/mercury.png'),
  },
  {
    name: 'Venus',
    description: 'Second planet from the Sun and hottest in the solar system.',
    diameter: '12,104 km',
    orbitTime: '225 days',
    moons: 0,
    image: require('@/assets/images/venus.png'),
  },
  {
    name: 'Earth',
    description: 'Our home planet, the only one known to support life.',
    diameter: '12,742 km',
    orbitTime: '365.25 days',
    moons: 1,
    image: require('@/assets/images/earth.png'),
  },
  {
    name: 'Mars',
    description: 'The Red Planet, known for its iron oxide-rich surface.',
    diameter: '6,779 km',
    orbitTime: '687 days',
    moons: 2,
    image: require('@/assets/images/mars.png'),
  },
  {
    name: 'Jupiter',
    description: 'The largest planet in the solar system.',
    diameter: '139,820 km',
    orbitTime: '4,333 days (11.86 years)',
    moons: 79,
    image: require('@/assets/images/jupiter.png'),
  },
  {
    name: 'Saturn',
    description: 'Famous for its stunning ring system.',
    diameter: '116,460 km',
    orbitTime: '10,759 days (29.5 years)',
    moons: 83,
    image: require('@/assets/images/saturn.png'),
  },
  {
    name: 'Uranus',
    description: 'An ice giant with a unique sideways rotation.',
    diameter: '50,724 km',
    orbitTime: '30,687 days (84 years)',
    moons: 27,
    image: require('@/assets/images/uranus.png'),
  },
  {
    name: 'Neptune',
    description: 'The farthest planet from the Sun, deep blue in color.',
    diameter: '49,244 km',
    orbitTime: '60,190 days (164.8 years)',
    moons: 14,
    image: require('@/assets/images/neptune.png'),
  },
];

export default function HomeScreen() {
  const viewableItems = useSharedValue([]);

  const viewabilityConfigCallbackPairs = useRef([
    {
      viewabilityConfig: { itemVisiblePercentThreshold: 50 },
      onViewableItemsChanged: ({ viewableItems: vItems }) => {
        viewableItems.value = vItems.map((viewableItem) => viewableItem.item.name);
      },
    },
  ]);

  const renderPlanet = ({ item }) => {
    const rStyle = useAnimatedStyle(() => {
      const isVisible = viewableItems.value.includes(item.name);
      return {
        opacity: withTiming(isVisible ? 1 : 0.3),
        transform: [
          {
            scale: withTiming(isVisible ? 1 : 0.8),
          },
        ],
      };
    });

    return (
      <Animated.View style={[styles.planetContainer, rStyle]}>
        <ThemedText type="title">{item.name}</ThemedText>
        <Image source={item.image} style={styles.planetImage} />
        <ThemedText>{item.description}</ThemedText>
        <ThemedText>Diameter: {item.diameter}</ThemedText>
        <ThemedText>Orbit Time: {item.orbitTime}</ThemedText>
        <ThemedText>Moons: {item.moons}</ThemedText>
      </Animated.View>
    );
  };

  return (
    <FlatList
      data={planets}
      keyExtractor={(item) => item.name}
      renderItem={renderPlanet}
      contentContainerStyle={styles.listContainer}
      viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
    />
  );
}
