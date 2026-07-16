import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TickCircle, CloseCircle, InfoCircle, Warning2 } from 'iconsax-react-native';

const TYPES = {
  success: { bg: '#f0fdf4', border: '#bbf7d0', icon: <TickCircle size={18} color="#16a34a" variant="Bold" />, titleColor: '#15803d', bodyColor: '#166534' },
  error:   { bg: '#fff1f2', border: '#fecdd3', icon: <CloseCircle size={18} color="#dc2626" variant="Bold" />, titleColor: '#dc2626', bodyColor: '#991b1b' },
  warning: { bg: '#fffbeb', border: '#fde68a', icon: <Warning2 size={18} color="#d97706" variant="Bold" />, titleColor: '#d97706', bodyColor: '#92400e' },
  info:    { bg: '#eff6ff', border: '#bfdbfe', icon: <InfoCircle size={18} color="#2563eb" variant="Bold" />, titleColor: '#2563eb', bodyColor: '#1e40af' },
};

const ToastBase = ({ text1, text2, type = 'success' }) => {
  const cfg = TYPES[type] || TYPES.info;
  return (
    <View style={[styles.container, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <View style={styles.iconWrap}>{cfg.icon}</View>
      <View style={styles.textWrap}>
        {text1 ? <Text style={[styles.title, { color: cfg.titleColor }]} numberOfLines={1}>{text1}</Text> : null}
        {text2 ? <Text style={[styles.body, { color: cfg.bodyColor }]} numberOfLines={2}>{text2}</Text> : null}
      </View>
    </View>
  );
};

export const toastConfig = {
  success: props => <ToastBase {...props} type="success" />,
  error:   props => <ToastBase {...props} type="error" />,
  warning: props => <ToastBase {...props} type="warning" />,
  info:    props => <ToastBase {...props} type="info" />,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    minWidth: '90%',
  },
  iconWrap: { flexShrink: 0 },
  textWrap: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', marginBottom: 1 },
  body:  { fontSize: 12, fontWeight: '500', lineHeight: 17 },
});
