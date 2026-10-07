import { StyleSheet, TextInput, View } from 'react-native';

import { colors, MAX_FONT_SCALE, MIN_TOUCH, radius, spacing, typography } from '@/theme';

import { Icon } from './Icon';

export function SearchBar({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  return (
    <View style={styles.box}>
      <Icon name="search" size={18} color="textSubtle" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        autoCorrect={false}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, ...typography.body, color: colors.text },
});
