import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, MAX_FONT_SCALE, MIN_TOUCH, radius, spacing, typography } from '@/theme';

import { IconButton } from './IconButton';
import { Text } from './Text';

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  secure?: boolean;
}

/** Labelled input with inline error; pairs with React Hook Form's Controller. */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField({ label, error, hint, secure, style, ...rest }, ref) {
  const [hidden, setHidden] = useState(!!secure);
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text variant="label" nativeID={`${label}-label`}>
        {label}
      </Text>
      <View style={[styles.box, focused && styles.focused, !!error && styles.errored]}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityLabelledBy={`${label}-label`}
          accessibilityHint={error ?? hint}
          accessibilityState={{ disabled: rest.editable === false }}
          placeholderTextColor={colors.textSubtle}
          secureTextEntry={hidden}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[styles.input, style]}
          {...rest}
        />
        {secure ? (
          <IconButton
            icon={hidden ? 'eye-outline' : 'eye-off-outline'}
            label={hidden ? 'Show password' : 'Hide password'}
            onPress={() => setHidden((h) => !h)}
            background="transparent"
            color="textMuted"
          />
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="textMuted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH + 4,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingLeft: spacing.md,
  },
  focused: { borderColor: colors.primary },
  errored: { borderColor: colors.danger },
  input: { flex: 1, ...typography.body, color: colors.text, paddingVertical: spacing.sm },
});
