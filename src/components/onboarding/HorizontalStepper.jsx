import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/colors';

const CheckIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 6L9 17l-5-5"
      stroke="#fff"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const HorizontalStepper = ({ steps, currentStep }) => (
  <View style={styles.wrap}>
    <View style={styles.row}>
      {steps.map((step, index) => {
        const done = index < currentStep;
        const active = index === currentStep;
        const upcoming = index > currentStep;

        return (
          <React.Fragment key={step.key}>
            <View style={styles.stepCol}>
              <View
                style={[
                  styles.circle,
                  done && styles.circleDone,
                  active && styles.circleActive,
                  upcoming && styles.circleUpcoming,
                ]}>
                {done ? (
                  <CheckIcon />
                ) : (
                  <Text
                    style={[
                      styles.circleText,
                      active && styles.circleTextActive,
                      upcoming && styles.circleTextUpcoming,
                    ]}>
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  (done || active) && styles.labelActive,
                ]}
                numberOfLines={1}>
                {step.shortLabel ?? step.label}
              </Text>
            </View>
            {index < steps.length - 1 ? (
              <View
                style={[
                  styles.connector,
                  index < currentStep && styles.connectorDone,
                ]}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: { marginBottom: 24, paddingHorizontal: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepCol: { alignItems: 'center', width: 72 },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  circleDone: { backgroundColor: colors.primary },
  circleActive: {
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: '#a7f3d0',
  },
  circleUpcoming: {
    backgroundColor: colors.border,
  },
  circleText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  circleTextActive: { color: '#fff' },
  circleTextUpcoming: { color: colors.textSecondary },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  labelActive: { color: colors.primary },
  connector: {
    flex: 1,
    height: 3,
    backgroundColor: colors.border,
    marginTop: 14,
    marginHorizontal: -8,
    borderRadius: 2,
  },
  connectorDone: { backgroundColor: colors.primary },
});

export default HorizontalStepper;
