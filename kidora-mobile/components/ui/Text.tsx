import { memo } from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useSettingsStore } from '@/store/settingsStore';
import { colors, MAX_FONT_SCALE, typography, type ColorToken, type TypographyVariant } from '@/theme';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: ColorToken;
  align?: TextStyle['textAlign'];
  weight?: TextStyle['fontWeight'];
}

/** All app text goes through here: tokens, OS font scaling (capped), optional "larger text". */
function TextBase({ variant = 'body', color = 'text', align, weight, style, ...rest }: TextProps) {
  const largeText = useSettingsStore((s) => s.largeText);
  const base = typography[variant];
  const scale = largeText ? 1.15 : 1;
  return (
    <RNText
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      style={[
        base,
        { color: colors[color], fontSize: base.fontSize * scale, lineHeight: base.lineHeight * scale },
        align ? { textAlign: align } : null,
        weight ? { fontWeight: weight } : null,
        style,
      ]}
      {...rest}
    />
  );
}

export const Text = memo(TextBase);
