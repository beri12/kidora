import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { isSafeUrl, openSafeUrl } from '@/lib/safe-links';
import { colors, radius, spacing } from '@/theme';
import type { LessonContentItem } from '@/types';

import { AudioBlock } from './AudioBlock';
import { VideoBlock } from './VideoBlock';

/** Strip HTML that authoring tools may store; children see plain text only. */
export function plainText(body: string | null | undefined): string {
  if (!body) return '';
  return body
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Renders one lesson content item. Unknown types degrade to their text so
 * new backend content types never crash the player.
 */
function ContentBlockBase({ item, onAskKai }: { item: LessonContentItem; onAskKai?: (item: LessonContentItem) => void }) {
  const { t } = useT();
  const text = plainText(item.body);

  switch (item.type) {
    case 'HEADING':
      return (
        <Text variant="h2" accessibilityRole="header">
          {item.title ?? text}
        </Text>
      );
    case 'VIDEO':
      return <VideoBlock url={item.url} video={item.video} title={item.title} />;
    case 'AUDIO':
      return item.url ? <AudioBlock url={item.url} title={item.title} /> : null;
    case 'IMAGE':
      return item.url ? (
        <Image
          source={{ uri: item.url }}
          style={styles.image}
          contentFit="contain"
          cachePolicy="disk"
          accessibilityLabel={item.title ?? text ?? undefined}
        />
      ) : null;
    case 'CODE':
      return (
        <View style={styles.code}>
          <Text style={styles.mono} color="textInverse" selectable>
            {item.body ?? ''}
          </Text>
        </View>
      );
    case 'CALLOUT':
    case 'EXAMPLE':
      return (
        <Card tone="tinted" tint={item.type === 'EXAMPLE' ? colors.accentSoft : colors.infoSoft}>
          {item.title ? <Text variant="bodyStrong">{item.title}</Text> : null}
          <Text>{text}</Text>
        </Card>
      );
    case 'EXTERNAL_RESOURCE':
    case 'RESOURCE':
    case 'DOCUMENT':
      // Only Kidora-hosted HTTPS links open (child safety).
      return item.url && isSafeUrl(item.url) ? (
        <Button label={item.title ?? t('student.lesson.resources')} icon="document-text" variant="outline" onPress={() => void openSafeUrl(item.url as string)} />
      ) : null;
    case 'QUESTION':
    case 'QUIZ':
    case 'ASSIGNMENT':
    case 'INTERACTIVE':
    case 'PEER_REVIEW':
      return (
        <Card tone="tinted" tint={colors.primarySoft}>
          <Text variant="bodyStrong">{item.title ?? t('student.activity.title')}</Text>
          {text ? <Text>{text}</Text> : null}
          {onAskKai ? <Button label={t('student.lesson.askKai')} size="sm" variant="ghost" icon="sparkles" onPress={() => onAskKai(item)} /> : null}
        </Card>
      );
    default:
      return text ? (
        <View style={{ gap: spacing.sm }}>
          {item.title ? <Text variant="h3">{item.title}</Text> : null}
          <Text style={styles.reading}>{text}</Text>
        </View>
      ) : null;
  }
}

export const ContentBlock = memo(ContentBlockBase);

const styles = StyleSheet.create({
  image: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.xl, backgroundColor: colors.surfaceMuted },
  code: { backgroundColor: '#1E1B4B', padding: spacing.lg, borderRadius: radius.lg },
  mono: { fontFamily: 'monospace', fontSize: 14, lineHeight: 20 },
  reading: { fontSize: 18, lineHeight: 28 },
});
