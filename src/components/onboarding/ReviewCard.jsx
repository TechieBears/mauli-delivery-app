import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { toHttpsUrl } from '../../utils/imageUrl';
import logger from '../../utils/logger';

const EditIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
      stroke={colors.primary}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
      stroke={colors.primary}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ReviewRow = ({ label, value, isImage }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    {isImage && value ? (
      <Image
        source={{ uri: toHttpsUrl(value) }}
        style={styles.thumbnail}
        resizeMode="cover"
        onError={e =>
          logger.log('[ReviewCard] image failed to load', label, {
            uri: toHttpsUrl(value),
            error: e?.nativeEvent?.error,
          })
        }
      />
    ) : (
      <Text style={styles.rowValue}>{value || '—'}</Text>
    )}
  </View>
);

const ReviewCard = ({ title, fields, onEdit }) => (
  <View style={styles.card}>
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {onEdit ? (
        <TouchableOpacity style={styles.editBtn} onPress={onEdit} hitSlop={8}>
          <EditIcon />
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      ) : null}
    </View>
    {fields.map(({ label, value, isImage }) => (
      <ReviewRow key={label} label={label} value={value} isImage={isImage} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  row: { marginBottom: 12 },
  rowLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
  },
});

export default ReviewCard;
