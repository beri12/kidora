import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { Button, Text, useToast } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { authService, type OAuthProvider } from '@/services/auth.service';
import { useAuth } from '@/providers/AuthProvider';
import { spacing } from '@/theme';

const SHOWN: OAuthProvider[] = ['google', 'facebook', 'tiktok', 'apple'];
const ICON = { google: 'logo-google', facebook: 'logo-facebook', tiktok: 'logo-tiktok', apple: 'logo-apple', microsoft: 'logo-microsoft', github: 'logo-github' } as const;

/** Only providers the backend reports as configured are offered (GET /auth/providers). */
export function SocialButtons() {
  const { t } = useT();
  const toast = useToast();
  const { loginWithProvider } = useAuth();
  const providers = useQuery({ queryKey: ['auth', 'providers'], queryFn: authService.providers, staleTime: 60 * 60_000, retry: false });
  const available = (providers.data ?? []).filter((p) => SHOWN.includes(p));
  if (!available.length) return null;
  return (
    <View style={styles.wrap}>
      <Text variant="caption" color="textMuted" align="center">
        {t('auth.login.or')}
      </Text>
      {available.map((p) => (
        <Button
          key={p}
          label={t(`auth.social.${p}`)}
          icon={ICON[p]}
          variant="outline"
          fullWidth
          onPress={() =>
            void loginWithProvider(p).catch(() => toast.show(t('auth.social.failed', { provider: t(`auth.social.${p}`) }), 'error'))
          }
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { gap: spacing.sm } });
