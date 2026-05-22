import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

interface OfflineIndicatorProps {
  pendingCount?: number;
}

export default function OfflineIndicator({ pendingCount = 0 }: OfflineIndicatorProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.text}>
        {t('common.offline')}
        {pendingCount > 0 && ` • ${pendingCount} pending`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
