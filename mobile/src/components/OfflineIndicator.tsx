import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Banner, Text, useTheme } from 'react-native-paper';
import NetInfo from '@react-native-netinfo/netinfo';
import { getPendingJobsCount } from '../services/db';
import { useTranslation } from 'react-i18next';

export default function OfflineIndicator() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected ?? false;
      setIsOnline(online);
      setVisible(!online || pendingCount > 0);
    });

    const interval = setInterval(async () => {
      const count = await getPendingJobsCount();
      setPendingCount(count);
      const net = await NetInfo.fetch();
      setVisible(!(net.isConnected ?? false) || count > 0);
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [pendingCount]);

  useEffect(() => {
    setVisible(!isOnline || pendingCount > 0);
  }, [isOnline, pendingCount]);

  if (!visible) return null;

  const message = !isOnline
    ? t('common.offline')
    : pendingCount > 0
    ? `${t('common.pendingSync')}: ${pendingCount}`
    : t('common.syncing');

  return (
    <View style={styles.container} accessibilityRole="alert" accessibilityLabel={message}>
      <Banner
        visible={visible}
        actions={[]}
        icon={!isOnline ? 'wifi-off' : pendingCount > 0 ? 'sync' : 'check-circle'}
        style={[
          styles.banner,
          { backgroundColor: !isOnline ? theme.colors.errorContainer : theme.colors.primaryContainer },
        ]}
      >
        <Text
          style={[
            styles.text,
            { color: !isOnline ? theme.colors.onErrorContainer : theme.colors.onPrimaryContainer },
          ]}
        >
          {message}
        </Text>
      </Banner>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  banner: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    minHeight: 40,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
});
