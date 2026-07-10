import { Text, TextInput, TextInputProps, StyleSheet, View } from 'react-native';

type FieldProps = TextInputProps & {
  label: string;
};

export function Field({ label, keyboardType, multiline, returnKeyType, selectTextOnFocus, style, ...props }: FieldProps) {
  const numericKeyboard = keyboardType === 'numeric' || keyboardType === 'number-pad' || keyboardType === 'decimal-pad';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        multiline={multiline}
        placeholderTextColor="#64748b"
        returnKeyType={returnKeyType ?? (multiline ? 'default' : 'next')}
        selectTextOnFocus={selectTextOnFocus ?? numericKeyboard}
        style={[styles.input, multiline && styles.multiline, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    color: '#f8fafc',
    fontSize: 16,
    padding: 14,
  },
  multiline: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
});
