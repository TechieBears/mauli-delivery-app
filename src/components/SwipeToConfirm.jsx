import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { CaretDoubleRight } from 'phosphor-react-native';
import { colors } from '../theme/colors';

const KNOB = 56;
const PADDING = 4;
// Far enough that a stray drag can't fire it, short enough to be one motion.
const COMMIT_RATIO = 0.75;

/**
 * Slide-to-confirm control for actions that must not be triggerable by a
 * mis-tap. Used for pickup confirmation, which moves a whole batch of orders to
 * intransit and cannot be undone from the app.
 *
 * Props:
 *  label     string  — text shown in the track
 *  disabled  bool    — greys out and ignores gestures
 *  loading   bool    — shows a spinner and ignores gestures
 *  onConfirm fn      — fired once, when the knob is dragged past the threshold
 */
const SwipeToConfirm = ({ label = 'Swipe to accept', disabled, loading, onConfirm }) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const x = useSharedValue(0);

  const maxX = Math.max(trackWidth - KNOB - PADDING * 2, 0);
  const inert = disabled || loading || maxX === 0;

  const fire = useCallback(() => {
    onConfirm?.();
  }, [onConfirm]);

  const pan = Gesture.Pan()
    .enabled(!inert)
    .onChange(e => {
      x.value = Math.min(Math.max(x.value + e.changeX, 0), maxX);
    })
    .onEnd(() => {
      if (x.value >= maxX * COMMIT_RATIO) {
        // Settle at the end so the control reads as "done" while the request
        // is in flight; the parent unmounts or resets it on completion.
        x.value = withTiming(maxX, { duration: 120 }, finished => {
          if (finished) runOnJS(fire)();
        });
      } else {
        x.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  // The label fades out as the knob covers it.
  const labelStyle = useAnimatedStyle(() => ({
    opacity: maxX ? interpolate(x.value, [0, maxX * 0.6], [1, 0], 'clamp') : 1,
  }));

  return (
    <View
      style={[styles.track, inert && styles.trackDisabled]}
      onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}>
      <Animated.Text style={[styles.label, labelStyle]} numberOfLines={1}>
        {label}
      </Animated.Text>

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.knob, knobStyle]}>
          {loading ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <CaretDoubleRight size={22} color={colors.surface} weight="bold" />
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: KNOB + PADDING * 2,
    borderRadius: (KNOB + PADDING * 2) / 2,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    padding: PADDING,
    justifyContent: 'center',
  },
  trackDisabled: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  label: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SwipeToConfirm;
