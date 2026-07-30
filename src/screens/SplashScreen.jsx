import React, { useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { ShieldCheck } from 'phosphor-react-native';
import { MauliLogo, SplashBgTexture } from '../assets/images';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import useAppStore from '../store/useAppStore';
import { fetchTransporterProfile } from '../services/transporterService';
import { isOnboardingIncomplete } from '../utils/onboardingProgress';

const BAR_WIDTH = 80;
const BAR_FILL_WIDTH = Math.round(BAR_WIDTH / 3);

const MeshBackground = () => {
  const { width, height } = useWindowDimensions();
  const r = width * 0.85;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="rg1" cx={0} cy={0} r={r} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors.meshGreenLight} stopOpacity="0.4" />
            <Stop offset="1" stopColor={colors.meshGreenLight} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="rg2" cx={width} cy={0} r={r} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.2" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="rg3" cx={width} cy={height} r={r} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors.meshGreenLight} stopOpacity="0.3" />
            <Stop offset="1" stopColor={colors.meshGreenLight} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="rg4" cx={0} cy={height} r={r} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.1" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#rg1)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#rg2)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#rg3)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#rg4)" />
      </Svg>
    </View>
  );
};

const BackgroundTexture = () => {
  const { width, height } = useWindowDimensions();
  return (
    <Image
      source={SplashBgTexture}
      style={[styles.bgTexture, { width, height }]}
      resizeMode="cover"
      blurRadius={2}
      pointerEvents="none"
    />
  );
};

const LoadingBar = () => {
  const offset = useSharedValue(-BAR_FILL_WIDTH);

  useEffect(() => {
    offset.value = withRepeat(
      withTiming(BAR_FILL_WIDTH * 2, {
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      false,
    );
  }, [offset]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <View style={styles.barTrack}>
      <Animated.View style={[styles.barFill, animatedStyle]} />
    </View>
  );
};

const SplashScreen = ({ navigation }) => {
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const storedKycStatus = useAppStore(state => state.kycStatus);
  const setKycStatus = useAppStore(state => state.setKycStatus);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!isAuthenticated) {
        navigation.replace('Welcome');
        return;
      }
      // The stored kycStatus can be stale after a reload — fetch the
      // transporter profile and route on the fresh status from the backend.
      let transporter = null;
      try {
        const profileRes = await fetchTransporterProfile();
        transporter = profileRes?.data ?? null;
      } catch (err) {
        // 401 already triggers a global logout + redirect (see api.js).
        if (err?.status === 401) return;
      }
      const kycStatus = transporter?.kycStatus ?? storedKycStatus;
      if (kycStatus) setKycStatus(kycStatus);

      if (kycStatus === 'approved') {
        navigation.replace('TransporterApp');
      } else if (isOnboardingIncomplete(kycStatus)) {
        // drafted / pending → the transporter's own KYC form. Never the shared
        // Onboarding screen: that one defaults to the customer role and would
        // fetch GET /customer/profile (403 for a transporter token).
        navigation.replace('TransporterKyc');
      } else {
        // onReview → under review; rejected → rejected message.
        navigation.replace('VerificationPending', { kycStatus });
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigation, isAuthenticated, storedKycStatus, setKycStatus]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.splashSurface} />
      <BackgroundTexture />
      <MeshBackground />

      <View style={styles.center}>
        <View style={styles.logoGlass}>
          <Image source={MauliLogo} style={styles.logo} resizeMode="contain" />
        </View>

        <View style={styles.nameBlock}>
          <Text style={styles.appName}>Mauli G-Mart</Text>
          <Text style={styles.appNameSecondary}>Transporter</Text>
        </View>

        <View style={styles.taglineBlock}>
          <Text style={styles.tagline}>Pick up. Deliver. Repeat.</Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <LoadingBar />
        <View style={styles.badge}>
          <ShieldCheck size={14} color={colors.primaryBase} weight="fill" />
          <Text style={styles.badgeText}>TRUSTED NETWORK</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.splashSurface,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingBottom: 64,
  },
  bgTexture: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.15,
    transform: [{ scale: 1.1 }],
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  logoGlass: {
    width: 112,
    height: 112,
    borderRadius: 40,
    backgroundColor: colors.glassWhite,
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 4,
  },
  logo: {
    width: 80,
    height: 80,
    transform: [{ rotate: '6deg' }],
  },
  nameBlock: {
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    fontFamily: fonts.plusJakartaSans.extraBold,
    fontSize: 42,
    letterSpacing: -2,
    color: colors.primary,
    textAlign: 'center',
    textShadowColor: colors.shadowSubtle,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  appNameSecondary: {
    fontFamily: fonts.plusJakartaSans.extraBold,
    fontSize: 32,
    letterSpacing: -1.2,
    color: colors.secondaryBrand,
    textAlign: 'center',
    marginTop: 2,
  },
  taglineBlock: {
    alignItems: 'center',
    gap: 10,
  },
  tagline: {
    fontFamily: fonts.inter.italic,
    fontSize: 16,
    color: colors.secondaryBrand,
  },

  bottom: {
    alignItems: 'center',
    gap: 32,
    zIndex: 1,
  },
  barTrack: {
    width: BAR_WIDTH,
    height: 4,
    backgroundColor: colors.shadowSubtle,
    borderRadius: 99,
    overflow: 'hidden',
  },
  barFill: {
    width: BAR_FILL_WIDTH,
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 99,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 3,
  },
  badgeText: {
    fontFamily: fonts.inter.bold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.primaryBase,
    opacity: 0.8,
  },
});

export default SplashScreen;
