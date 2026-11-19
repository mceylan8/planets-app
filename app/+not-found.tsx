import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui/kit';
import { color, space } from '@/constants/theme';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <AppText variant="title">Diese Seite gibt es nicht.</AppText>
      <Button label="Zum Sonnensystem" onPress={() => router.replace('/')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.lg,
    backgroundColor: color.space,
  },
});
