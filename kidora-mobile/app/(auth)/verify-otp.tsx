import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button, Card, Text } from '@/components/ui';
import { AuthShell } from '@/features/auth/AuthShell';
import { ControlledField } from '@/features/auth/ControlledField';
import { otpCodeSchema, otpPhoneSchema } from '@/features/auth/schemas';
import { useAuthErrorMessage } from '@/features/auth/useAuthError';
import { useT } from '@/hooks/useT';
import { replace } from '@/lib/navigation';
import { ROLE_HOME } from '@/lib/roles';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme';

const RESEND_SECONDS = 45;

/** Passwordless SMS sign-in: POST /auth/otp/request → POST /auth/otp/verify. */
export default function VerifyOtp() {
  const { t } = useT();
  const { requestOtp, verifyOtp } = useAuth();
  const errorMessage = useAuthErrorMessage();
  const [phone, setPhone] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const phoneForm = useForm<{ phone: string }>({ resolver: zodResolver(otpPhoneSchema), defaultValues: { phone: '' } });
  const codeForm = useForm<{ code: string }>({ resolver: zodResolver(otpCodeSchema), defaultValues: { code: '' } });

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const send = phoneForm.handleSubmit(async ({ phone: p }) => {
    setError(null);
    try {
      await requestOtp(p);
      setPhone(p);
      setCooldown(RESEND_SECONDS);
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  const verify = codeForm.handleSubmit(async ({ code }) => {
    if (!phone) return;
    setError(null);
    try {
      const user = await verifyOtp(phone, code);
      replace(ROLE_HOME[user.role]);
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <AuthShell title={t('auth.otp.title')}>
      {!phone ? (
        <>
          <ControlledField control={phoneForm.control} name="phone" label={t('auth.otp.phone')} keyboardType="phone-pad" autoComplete="tel" placeholder="+251 9…" />
          <Button label={t('auth.otp.send')} size="lg" fullWidth loading={phoneForm.formState.isSubmitting} onPress={() => void send()} />
        </>
      ) : (
        <>
          <Text color="textMuted">{t('auth.otp.sentTo', { phone })}</Text>
          <ControlledField
            control={codeForm.control}
            name="code"
            label={t('auth.otp.code')}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            onSubmitEditing={() => void verify()}
          />
          <Button label={t('auth.otp.verify')} size="lg" fullWidth loading={codeForm.formState.isSubmitting} onPress={() => void verify()} />
          <Button
            label={cooldown > 0 ? t('auth.otp.resendIn', { seconds: cooldown }) : t('auth.otp.resend')}
            variant="ghost"
            disabled={cooldown > 0}
            onPress={() => void send()}
          />
        </>
      )}
      {error ? (
        <Card tone="tinted" tint={colors.dangerSoft}>
          <Text color="danger" accessibilityLiveRegion="assertive">
            {error}
          </Text>
        </Card>
      ) : null}
    </AuthShell>
  );
}
