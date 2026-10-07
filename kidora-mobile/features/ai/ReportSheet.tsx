import { View } from 'react-native';

import { BottomSheet, Button } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { spacing } from '@/theme';
import type { AiReportReason } from '@/types';

const REASONS: AiReportReason[] = ['inappropriate', 'wrong', 'confusing', 'other'];

export function ReportSheet({ visible, onClose, onSubmit }: { visible: boolean; onClose: () => void; onSubmit: (r: AiReportReason) => void }) {
  const { t } = useT();
  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('ai.reportTitle')}>
      <View style={{ gap: spacing.sm }}>
        {REASONS.map((r) => (
          <Button key={r} label={t(`ai.reportReasons.${r}`)} variant="outline" fullWidth onPress={() => onSubmit(r)} />
        ))}
      </View>
    </BottomSheet>
  );
}
