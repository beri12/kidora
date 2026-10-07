import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button, Card, ScalePressable, Text } from '@/components/ui';
import { AuthShell } from '@/features/auth/AuthShell';
import { ControlledField } from '@/features/auth/ControlledField';
import { registerSchema, ROLE_VALUES, type RegisterForm } from '@/features/auth/schemas';
import { useAuthErrorMessage } from '@/features/auth/useAuthError';
import { useT } from '@/hooks/useT';
import { go, replace } from '@/lib/navigation';
import { ROLE_HOME } from '@/lib/roles';
import { useAuth } from '@/providers/AuthProvider';
import { colors, KID_TOUCH, radius, spacing } from '@/theme';
import type { UserRole } from '@/types';

const ROLE_EMOJI: Record<UserRole, string> = { STUDENT: '🧒🏾', PARENT: '👪', TEACHER: '🧑🏾‍🏫', SCHOOL_LEADER: '🏫', DISTRICT_LEADER: '🗺️' };

export default function Register() {
  const { t } = useT();
  const { register } = useAuth();
  const errorMessage = useAuthErrorMessage();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'STUDENT', name: '', email: '', phone: '', password: '', confirmPassword: '', schoolCode: '', schoolName: '', districtName: '', gradeLevel: '' },
  });
  const role = useWatch({ control, name: 'role' });

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      const user = await register({
        role: v.role,
        name: v.name,
        email: v.email,
        password: v.password,
        // Children never need to give a phone number (data minimisation).
        phone: v.role === 'STUDENT' ? undefined : v.phone || undefined,
        schoolCode: v.schoolCode,
        schoolName: v.schoolName,
        districtName: v.districtName,
        gradeLevel: v.gradeLevel,
      });
      replace(ROLE_HOME[user.role]);
    } catch (e) {
      setFormError(errorMessage(e));
    }
  });

  return (
    <AuthShell title={t('auth.register.title')}>
      <Text variant="h3">{t('auth.register.whoAreYou')}</Text>
      <Controller
        control={control}
        name="role"
        render={({ field: { value, onChange } }) => (
          <View style={styles.roles} accessibilityRole="radiogroup">
            {ROLE_VALUES.map((r) => {
              const on = value === r;
              return (
                <ScalePressable
                  key={r}
                  onPress={() => onChange(r)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={t(`auth.roles.${r}`)}
                  style={[styles.role, on && styles.roleOn]}
                  testID={`role-${r}`}
                >
                  <Text style={styles.emoji}>{ROLE_EMOJI[r]}</Text>
                  <Text variant="label" align="center">
                    {t(`auth.roles.${r}`)}
                  </Text>
                </ScalePressable>
              );
            })}
          </View>
        )}
      />
      <ControlledField control={control} name="name" label={t('auth.register.name')} autoComplete="name" testID="register-name" />
      <ControlledField control={control} name="email" label={t('auth.register.email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" testID="register-email" />
      {role !== 'STUDENT' ? (
        <ControlledField control={control} name="phone" label={t('auth.register.phone')} keyboardType="phone-pad" autoComplete="tel" />
      ) : null}
      <ControlledField control={control} name="password" label={t('auth.register.password')} secure autoComplete="new-password" testID="register-password" />
      <ControlledField control={control} name="confirmPassword" label={t('auth.register.confirmPassword')} secure autoComplete="new-password" testID="register-confirm" />
      {role === 'STUDENT' || role === 'TEACHER' ? (
        <ControlledField control={control} name="schoolCode" label={t('auth.register.schoolCode')} autoCapitalize="characters" />
      ) : null}
      {role === 'STUDENT' ? <ControlledField control={control} name="gradeLevel" label={t('auth.register.gradeLevel')} /> : null}
      {role === 'SCHOOL_LEADER' ? <ControlledField control={control} name="schoolName" label={t('auth.register.schoolName')} /> : null}
      {role === 'DISTRICT_LEADER' ? <ControlledField control={control} name="districtName" label={t('auth.register.districtName')} /> : null}
      <Text variant="caption" color="textMuted">
        {t('auth.register.privacy')}
      </Text>
      {formError ? (
        <Card tone="tinted" tint={colors.dangerSoft}>
          <Text color="danger" accessibilityLiveRegion="assertive">
            {formError}
          </Text>
        </Card>
      ) : null}
      <Button label={t('auth.register.submit')} variant="game" size="lg" fullWidth loading={formState.isSubmitting} onPress={() => void onSubmit()} testID="register-submit" />
      <Button label={t('auth.register.haveAccount')} variant="ghost" onPress={() => go('/(auth)/login')} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  role: {
    flexBasis: '30%',
    flexGrow: 1,
    minHeight: KID_TOUCH + 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  roleOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  emoji: { fontSize: 28, lineHeight: 36 },
});
