import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

const FormField = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  multiline,
  keyboardType,
  autoCapitalize,
  maxLength,
  editable = true,
  icon,
}) => (
  <View style={styles.group}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <View
      style={[
        styles.inputWrap,
        multiline && styles.inputWrapMultiline,
        error && styles.inputError,
        !editable && styles.inputDisabled,
      ]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        maxLength={maxLength}
        editable={editable}
      />
    </View>
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  group: { marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 52,
    backgroundColor: colors.inputBg,
    gap: 10,
  },
  inputWrapMultiline: {
    alignItems: 'flex-start',
    paddingVertical: 12,
    minHeight: 100,
  },
  inputError: { borderColor: colors.error },
  inputDisabled: { backgroundColor: '#f3f4f6' },
  icon: { marginTop: 2 },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 14,
  },
  inputMultiline: {
    minHeight: 80,
    paddingTop: 0,
    paddingBottom: 0,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 6,
  },
});

export default FormField;
