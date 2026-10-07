import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button, Card, Text } from '@/components/ui';
import { AuthShell } from '@/features/auth/AuthShell';
import { ControlledField } from '@/features/auth/ControlledField';
import { forgotSchema } from '@/features/auth/schemas';
import { useT } from '@/hooks/useT';
import { go } from '@/lib/navigation';
import { authService } from '@/services/auth.service';
import { colors } from '@/theme';

export default function ForgotPassword() {
  const { t } = useT();
  const [sent, setSent] = useState(false);
  const { control, handleSubmit, formState } = useForm<{ email: string }>({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } });

  const onSubmit = handleSubmit(async ({ email }) => {
    // Same confirmation whatever happens: never reveal whether an email is registered.
    await authService.requestPasswordReset(email).catch(() => undefined);
    setSent(true);
  });

  return (
    <AuthShell title={t('auth.forgot.title')} subtitle={t('auth.forgot.body')}>
      {sent ? (
        <Card tone="tinted" tint={colors.successSoft}>
          <Text accessibilityLiveRegion="polite">{t('auth.forgot.sent')}</Text>
        </Card>
      ) : (
        <>
          <ControlledField control={control} name="email" label={t('auth.register.email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Button label={t('auth.forgot.submit')} size="lg" fullWidth loading={formState.isSubmitting} onPress={() => void onSubmit()} />
        </>
      )}
      <Button label={t('auth.reset.title')} variant="ghost" onPress={() => go('/(auth)/reset-password')} />
    </AuthShell>
  );
}
