import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, StyleSheet } from 'react-native';
import { ArrowLeft2, Notification, Setting2, Edit2 } from 'iconsax-react-native';
import { MenuIcon, RefreshIcon } from './/vendor/VendorIcons';
import { colors } from '../theme/colors';

/**
 * Props:
 *  title        string   — center text
 *  leftIcon     'menu' | 'back' | null
 *  onLeftPress  fn
 *  rightIcon    'bell' | 'refresh' | null
 *  onRightPress fn
 */
const AppHeader = ({ title, leftIcon, onLeftPress, rightIcon, onRightPress }) => {
  const renderLeft = () => {
    if (leftIcon === 'menu') return <MenuIcon />;
    if (leftIcon === 'back') return <ArrowLeft2 size={20} color={colors.text} variant="Linear" />;
    return null;
  };

  const renderRight = () => {
    if (rightIcon === 'bell') return <Notification size={22} color={colors.text} variant="Linear" />;
    if (rightIcon === 'refresh') return <RefreshIcon />;
    if (rightIcon === 'settings') return <Setting2 size={22} color={colors.text} variant="Linear" />;
    if (rightIcon === 'edit') return <Edit2 size={20} color={colors.text} variant="Linear" />;
    return null;
  };

  const left = renderLeft();
  const right = renderRight();

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <View style={styles.slot}>
          {left ? (
            <TouchableOpacity onPress={onLeftPress} activeOpacity={0.7} style={styles.iconBtn}>
              {left}
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.title} numberOfLines={1}>{title}</Text>

        <View style={[styles.slot, styles.slotRight]}>
          {right ? (
            <TouchableOpacity onPress={onRightPress} activeOpacity={0.7} style={styles.iconBtn}>
              {right}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  slot: {
    width: 36,
    alignItems: 'flex-start',
  },
  slotRight: {
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  iconBtn: {
    padding: 4,
  },
});

export default AppHeader;
