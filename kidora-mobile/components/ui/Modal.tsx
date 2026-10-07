import type { ReactNode } from 'react';
import { Modal as RNModal, Pressable, StyleSheet, View } from 'react-native';

import { useT } from '@/hooks/useT';
import { colors, radius, shadows, spacing } from '@/theme';

import { IconButton } from './IconButton';
import { Text } from './Text';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  dismissable?: boolean;
}

export function Modal({ visible, onClose, title, children, dismissable = true }: ModalProps) {
  const { t } = useT();
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={dismissable ? onClose : undefined} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissable ? onClose : undefined} accessibilityLabel={t('common.close')} />
        <View style={[styles.card, shadows.lg]} accessibilityViewIsModal>
          {title || dismissable ? (
            <View style={styles.header}>
              <Text variant="h3" style={{ flex: 1 }} accessibilityRole="header">
                {title}
              </Text>
              {dismissable ? <IconButton icon="close" label={t('common.close')} onPress={onClose} background={colors.surfaceMuted} /> : null}
            </View>
          ) : null}
          {children}
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: { width: '100%', maxWidth: 480, backgroundColor: colors.surface, borderRadius: radius['2xl'], padding: spacing.xl, gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
