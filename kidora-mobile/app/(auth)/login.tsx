import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { AuthShell } from '@/features/auth/AuthShell';
import { ControlledField } from '@/features/auth/ControlledField';
import { loginSchema, type LoginForm } from '@/features/auth/schemas';
import { SocialButtons } from '@/features/auth/SocialButtons';
import { useAuthErrorMessage } from '@/features/auth/useAuthError';
import { useT } from '@/hooks/useT';
import { isApiError } from '@/lib/errors';
import { go, replace } from '@/lib/navigation';
import { ROLE_HOME } from '@/lib/roles';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';

export default function Login() {
  const { t } = useT();
  const { login } = useAuth();
  const errorMessage = useAuthErrorMessage();
  const [formError, setFormError] = useState<string | null>(null);
  const [needsMfa, setNeedsMfa] = useState(false);
  const { control, handleSubmit, formState } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '', mfaCode: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const user = await login({ identifier: values.identifier, password: values.password, mfaCode: values.mfaCode || undefined });
      replace(ROLE_HOME[user.role]);
    } catch (e) {
      if (isApiError(e) && e.serverMessage === 'MFA_REQUIRED') {
        setNeedsMfa(true);
        setFormError(t('auth.login.mfaRequired'));
        return;
      }
      setFormError(errorMessage(e));
    }
  });

  return (
    <AuthShell title={t('auth.login.title')}>
      <ControlledField
        control={control}
        name="identifier"
        label={t('auth.login.identifier')}
        autoCapitalize="none"
        autoComplete="username"
        keyboardType="email-address"
        textContentType="username"
        testID="login-identifier"
      />
      <ControlledField
        control={control}
        name="password"
        label={t('auth.login.password')}
        secure
        autoComplete="current-password"
        textContentType="password"
        testID="login-password"
        onSubmitEditing={() => void onSubmit()}
      />
      {needsMfa ? (
        <ControlledField control={control} name="mfaCode" label={t('auth.login.mfaCode')} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" />
      ) : null}
      {formError ? (
        <Card tone="tinted" tint={colors.dangerSoft}>
          <Text color="danger" accessibilityLiveRegion="assertive" testID="login-error">
            {formError}
          </Text>
        </Card>
      ) : null}
      <Button label={t('auth.login.submit')} size="lg" fullWidth loading={formState.isSubmitting} onPress={() => void onSubmit()} testID="login-submit" />
      <View style={{ gap: spacing.xs }}>
        <Button label={t('auth.login.forgot')} variant="ghost" onPress={() => go('/(auth)/forgot-password')} />
        <Button label={t('auth.login.useOtp')} variant="ghost" icon="chatbubble-ellipses" onPress={() => go('/(auth)/verify-otp')} />
      </View>
      <SocialButtons />
      <Button label={t('auth.login.noAccount')} variant="secondary" fullWidth onPress={() => go('/(auth)/register')} />
    </AuthShell>
  );
}
