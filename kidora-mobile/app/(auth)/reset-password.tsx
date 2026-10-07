import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button, Card, Text } from '@/components/ui';
import { AuthShell } from '@/features/auth/AuthShell';
import { ControlledField } from '@/features/auth/ControlledField';
import { resetSchema } from '@/features/auth/schemas';
import { useAuthErrorMessage } from '@/features/auth/useAuthError';
import { useT } from '@/hooks/useT';
import { replace } from '@/lib/navigation';
import { authService } from '@/services/auth.service';
import { colors } from '@/theme';

/** Opened from the reset email: kidora://reset-password?token=… */
export default function ResetPassword() {
  const { t } = useT();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const errorMessage = useAuthErrorMessage();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<{ token: string; password: string; confirmPassword: string }>({
    resolver: zodResolver(resetSchema),
    defaultValues: { token: token ?? '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await authService.resetPassword(v.token, v.password);
      setDone(true);
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <AuthShell title={t('auth.reset.title')}>
      {done ? (
        <>
          <Card tone="tinted" tint={colors.successSoft}>
            <Text>{t('auth.reset.done')}</Text>
          </Card>
          <Button label={t('auth.login.submit')} size="lg" fullWidth onPress={() => replace('/(auth)/login')} />
        </>
      ) : (
        <>
          {!token ? <ControlledField control={control} name="token" label={t('auth.reset.token')} autoCapitalize="none" /> : null}
          <ControlledField control={control} name="password" label={t('auth.register.password')} secure autoComplete="new-password" />
          <ControlledField control={control} name="confirmPassword" label={t('auth.register.confirmPassword')} secure autoComplete="new-password" />
          {error ? (
            <Card tone="tinted" tint={colors.dangerSoft}>
              <Text color="danger">{error}</Text>
            </Card>
          ) : null}
          <Button label={t('auth.reset.submit')} size="lg" fullWidth loading={formState.isSubmitting} onPress={() => void onSubmit()} />
        </>
      )}
    </AuthShell>
  );
}
