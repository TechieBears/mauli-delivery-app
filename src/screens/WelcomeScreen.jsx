import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Button from '../components/Button';

const HERO_IMAGE = {
  uri: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
};

const WelcomeScreen = ({ navigation }) => {
  const handleLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>

        {/* Hero card */}
        <View style={styles.heroCard}>
          <Image
            source={HERO_IMAGE}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroBadge}>
            <Svg width={10} height={10} viewBox="0 0 24 24">
              <Circle cx="12" cy="12" r="12" fill="#2e7d32" />
            </Svg>
            <Text style={styles.heroBadgeText}>AUTHENTIC ROOTS</Text>
          </View>
        </View>

        {/* Welcome copy */}
        <View style={styles.copyBlock}>
          <Text style={styles.heading}>Welcome, Transporter</Text>
          <Text style={styles.subheading}>
            Pick up orders from vendors and deliver them to customers across the
            region's premium organic supply network.
          </Text>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <Button title="Login" onPress={handleLogin} size="lg" fullWidth />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 24,
  },

  /* hero */
  heroCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    overflow: 'hidden',
    height: 200,
    backgroundColor: '#e8f5e9',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2e7d32',
    letterSpacing: 1.2,
  },

  /* copy */
  copyBlock: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 21,
  },

  /* footer */
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
});

export default WelcomeScreen;
