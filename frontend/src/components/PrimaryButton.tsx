import { Pressable, StyleSheet, Text } from 'react-native';

import { zenith } from '@/constants/zenithTheme';

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
};

export function PrimaryButton({ title, onPress, disabled }: PrimaryButtonProps) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.button, disabled && styles.disabled]}>
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: zenith.colors.primary,
    borderRadius: 18,
    padding: 15,
  },
  disabled: {
    opacity: 0.55,
  },
  text: {
    color: zenith.colors.primaryForeground,
    fontFamily: zenith.font.bodyBold,
    fontSize: 16,
    fontWeight: '900',
  },
});
