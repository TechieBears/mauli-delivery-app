import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

const LinearStepProgress = ({ currentStep, totalSteps, percentLabel }) => {
  const progress = (currentStep + 1) / totalSteps;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            STEP {currentStep + 1} OF {totalSteps}
          </Text>
        </View>
        {percentLabel ? (
          <Text style={styles.percent}>{percentLabel}</Text>
        ) : null}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: 20 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    backgroundColor: colors.warningBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400e',
    letterSpacing: 0.6,
  },
  percent: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  track: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
});

export default LinearStepProgress;
