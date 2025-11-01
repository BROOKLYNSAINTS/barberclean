import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '../styles/theme';

export const ScreenContainer = ({ children, style }) => {
  return (
    <View style={[styles.screenContainer, style]}>
      {children}
    </View>
  );
};

export const ScreenHeader = ({ title, leftComponent, rightComponent, style }) => {
  return (
    <View style={[styles.screenHeader, style]}>
      {leftComponent && <View style={styles.headerSide}>{leftComponent}</View>}
      <Text style={styles.screenHeaderTitle}>{title}</Text>
      {rightComponent && <View style={styles.headerSide}>{rightComponent}</View>}
    </View>
  );
};

export const GridRow = ({ children, style }) => {
  return (
    <View style={[styles.gridRow, style]}>
      {children}
    </View>
  );
};

export const GridColumn = ({ children, size = 1, style }) => {
  return (
    <View style={[styles.gridColumn, { flex: size }, style]}>
      {children}
    </View>
  );
};

export const ResponsiveText = ({ text, style, numberOfLines }) => {
  return (
    <Text style={[styles.responsiveText, style]} numberOfLines={numberOfLines}>
      {text}
    </Text>
  );
};

export const ResponsiveImage = ({ source, style, resizeMode = 'cover' }) => {
  return (
    <View style={[styles.responsiveImage, style]}>
      {/* Replace with actual Image component in implementation */}
      <View style={{ backgroundColor: '#ddd', width: '100%', height: '100%' }} />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    backgroundColor: '#fff',
    paddingHorizontal: theme.spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    ...theme.shadows.small,
  },
  screenHeaderTitle: {
    fontSize: theme.typography.fontSize.large,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  headerSide: {
    position: 'absolute',
    height: '100%',
    justifyContent: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    marginHorizontal: -theme.spacing.small,
  },
  gridColumn: {
    paddingHorizontal: theme.spacing.small,
  },
  responsiveText: {
    fontSize: theme.typography.fontSize.medium,
    color: theme.colors.textPrimary,
  },
  responsiveImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: theme.borderRadius.medium,
    overflow: 'hidden',
  },
});
