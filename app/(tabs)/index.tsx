import React from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

const planets = [
  {
    name: 'Mercury',
    description: 'The smallest planet and closest to the Sun.',
    image: require('@/assets/images/mercury.png'),
  },
  {
    name: 'Venus',
    description: 'Second planet from the Sun and hottest in the solar system.',
    image: require('@/assets/images/venus.png'),
  },
  {
    name: 'Earth',
    description: 'Our home planet, the only one known to support life.',
    image: require('@/assets/images/earth.png'),
  },
  {
    name: 'Mars',
    description: 'The Red Planet, known for its iron oxide-rich surface.',
    image: require('@/assets/images/venus.png'),
  },
  {
    name: 'Jupiter',
    description: 'The largest planet in the solar system.',
    image: require('@/assets/images/earth.png'),
  },
  {
    name: 'Saturn',
    description: 'Famous for its stunning ring system.',
    image: require('@/assets/images/mercury.png'),
  },
  {
    name: 'Uranus',
    description: 'An ice giant with a unique sideways rotation.',
    image: require('@/assets/images/earth.png'),
  },
  {
    name: 'Neptune',
    description: 'The farthest planet from the Sun, deep blue in color.',
    image: require('@/assets/images/venus.png'),
  },
];

export default function HomeScreen() {
  const renderPlanet = ({ item }) => (
    <ThemedView style={styles.planetContainer}>
      <Image source={item.image} style={styles.planetImage} />
      <ThemedText type="title">{item.name}</ThemedText>
      <ThemedText>{item.description}</ThemedText>
    </ThemedView>
  );

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/solar-system.jpg')}
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Planets of the Solar System</ThemedText>
      </ThemedView>
      <FlatList
        data={planets}
        keyExtractor={(item) => item.name}
        renderItem={renderPlanet}
        contentContainerStyle={styles.listContainer}
      />
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    padding: 16,
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  planetContainer: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  planetImage: {
    height: 100,
    width: 100,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  headerImage: {
    height: 200,
    width: '100%',
    resizeMode: 'cover',
  },
});
