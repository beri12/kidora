import { Screen, ScreenHeader } from '@/components/layout';
import { Button, Card, Text } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { openSafeUrl } from '@/lib/safe-links';

export default function HelpModal() {
  const { t } = useT();
  const faqs = [
    [t('help.faq1q'), t('help.faq1a')],
    [t('help.faq2q'), t('help.faq2a')],
    [t('help.faq3q'), t('help.faq3a')],
  ] as const;
  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title={t('help.title')} back />
      {faqs.map(([q, a]) => (
        <Card key={q}>
          <Text variant="bodyStrong" accessibilityRole="header">
            {q}
          </Text>
          <Text color="textMuted">{a}</Text>
        </Card>
      ))}
      <Text color="textMuted">{t('help.contact')}</Text>
      <Button label={t('help.openSupport')} icon="open-outline" variant="outline" onPress={() => void openSafeUrl('https://justkidora.com/support')} />
    </Screen>
  );
}
