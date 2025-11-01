import theme from '../styles/theme';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';

export const Button = ({ title, onPress, style, icon, disabled, textStyle, small }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.button, disabled && styles.buttonDisabled, style]}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {icon &&
        (typeof icon === 'string' || typeof icon === 'number' ? (
          <Text style={{ marginRight: 6 }}>{icon}</Text>
        ) : (
          <View style={{ marginRight: 6 }}>{icon}</View>
        ))
      }
      <Text style={[styles.buttonText, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};
export const Card = ({ children, style }) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

export const EmptyState = ({ icon, title, message, actionButton }) => {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      <Text style={styles.emptyStateMessage}>{message}</Text>
      {actionButton}
    </View>
  );
};

export const Badge = ({ text, type = 'default', style }) => {
  const badgeStyle = {
    default: styles.badgeDefault,
    primary: styles.badgePrimary,
    success: styles.badgeSuccess,
    warning: styles.badgeWarning,
    error: styles.badgeError,
  };

  return (
    <View style={[styles.badge, badgeStyle[type], style]}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
};

export const Divider = ({ style }) => {
  return <View style={[styles.divider, style]} />;
};

export const LoadingState = ({ size = 'medium', text }) => {
  return (
    <View style={styles.loadingState}>
      <Text style={styles.loadingText}>{text || 'Loading...'}</Text>
    </View>
  );
};

export const SectionHeader = ({ title, subtitle, rightComponent }) => {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionHeaderTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionHeaderSubtitle}>{subtitle}</Text>}
      </View>
      {rightComponent && <View>{rightComponent}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.small,
    paddingHorizontal: theme.spacing.medium,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonDisabled: {
    backgroundColor: theme.colors.disabled,
  },
  buttonText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.medium,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.medium,
    ...theme.shadows.medium,
    marginVertical: theme.spacing.small,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.large,
  },
  emptyStateTitle: {
    fontSize: theme.typography.fontSize.large,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.small,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: theme.typography.fontSize.medium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.medium,
  },
  badge: {
    paddingHorizontal: theme.spacing.small,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.small,
    alignSelf: 'flex-start',
  },
  badgeDefault: {
    backgroundColor: theme.colors.backgroundLight,
  },
  badgePrimary: {
    backgroundColor: theme.colors.primary,
  },
  badgeSuccess: {
    backgroundColor: theme.colors.success,
  },
  badgeWarning: {
    backgroundColor: theme.colors.warning,
  },
  badgeError: {
    backgroundColor: theme.colors.error,
  },
  badgeText: {
    fontSize: theme.typography.fontSize.small,
    color: '#fff',
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.medium,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.large,
  },
  loadingText: {
    fontSize: theme.typography.fontSize.medium,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.small,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.medium,
    marginTop: theme.spacing.medium,
  },
  sectionHeaderTitle: {
    fontSize: theme.typography.fontSize.large,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  sectionHeaderSubtitle: {
    fontSize: theme.typography.fontSize.small,
    color: theme.colors.textSecondary,
  },
});
