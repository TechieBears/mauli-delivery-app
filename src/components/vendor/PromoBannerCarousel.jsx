import React, { useRef } from 'react';
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Carousel, { Pagination } from 'react-native-reanimated-carousel';
import { useSharedValue } from 'react-native-reanimated';
import { ArrowRightIcon } from './VendorIcons';
import { colors } from '../../theme/colors';
import { PROMO_BANNERS } from '../../constants/promoBanners';

const SCREEN_WIDTH = Dimensions.get('window').width;
const HORIZONTAL_PADDING = 16;
const BANNER_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;
const BANNER_HEIGHT = 180;

const BannerSlide = ({ item }) => (
  <ImageBackground
    source={{ uri: item.image }}
    style={styles.slide}
    imageStyle={styles.slideImage}
    resizeMode="cover">
    <View style={styles.overlay} />
    <Text style={[styles.tag, { backgroundColor: item.tagBg }]}>{item.tag}</Text>
    <Text style={styles.title}>{item.title}</Text>
    <Text style={styles.body}>{item.body}</Text>
    <TouchableOpacity style={styles.cta} activeOpacity={0.8}>
      <Text style={styles.ctaText}>{item.cta}</Text>
      <ArrowRightIcon />
    </TouchableOpacity>
    <Text style={styles.watermark}>{item.watermark}</Text>
  </ImageBackground>
);

const PromoBannerCarousel = () => {
  const carouselRef = useRef(null);
  const progress = useSharedValue(0);

  return (
    <View style={styles.wrap}>
      <Carousel
        ref={carouselRef}
        width={BANNER_WIDTH}
        height={BANNER_HEIGHT}
        data={PROMO_BANNERS}
        loop
        autoPlay
        autoPlayInterval={4000}
        scrollAnimationDuration={600}
        onProgressChange={progress}
        renderItem={({ item }) => <BannerSlide item={item} />}
      />

      <Pagination.Basic
        progress={progress}
        data={PROMO_BANNERS}
        containerStyle={styles.pagination}
        dotStyle={styles.dot}
        activeDotStyle={styles.dotActive}
        onPress={index => carouselRef.current?.scrollTo({ index, animated: true })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 20,
    alignItems: 'center',
  },
  slide: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  slideImage: {
    borderRadius: 24,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: 24,
  },
  tag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
    letterSpacing: 0.5,
    zIndex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 24,
    marginBottom: 6,
    paddingRight: 24,
    zIndex: 1,
  },
  body: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 20,
    marginBottom: 12,
    zIndex: 1,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 1,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4ade80',
  },
  watermark: {
    position: 'absolute',
    right: -12,
    bottom: 6,
    fontSize: 44,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.12)',
    letterSpacing: 3,
    transform: [{ rotate: '-12deg' }],
    zIndex: 1,
  },
  pagination: {
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d1d5db',
  },
  dotActive: {
    width: 18,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
});

export default PromoBannerCarousel;
