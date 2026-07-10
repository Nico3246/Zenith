import { Pressable, StyleSheet, Text, View } from 'react-native';

type SegmentedOption = {
  label: string;
  value: string;
};

type SegmentedFieldProps = {
  label: string;
  options: SegmentedOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
};

export function SegmentedField({ label, options, selectedValue, onValueChange }: SegmentedFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.segmented}>
        {options.map((option) => {
          const selected = option.value === selectedValue;
          return (
            <Pressable
              key={option.value}
              onPress={() => onValueChange(option.value)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { color: '#cbd5e1', fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  segmented: { backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 6, padding: 4 },
  option: { alignItems: 'center', borderRadius: 10, flex: 1, paddingVertical: 11 },
  optionSelected: { backgroundColor: '#38bdf8' },
  optionText: { color: '#cbd5e1', fontWeight: '900' },
  optionTextSelected: { color: '#020617' },
});
