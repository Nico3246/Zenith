import { Picker } from '@react-native-picker/picker';
import { StyleSheet, Text, View } from 'react-native';

type PickerOption = {
  label: string;
  value: string;
};

type PickerFieldProps = {
  label: string;
  options: PickerOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
};

export function PickerField({ label, options, selectedValue, onValueChange }: PickerFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pickerFrame}>
        <Picker dropdownIconColor="#f8fafc" selectedValue={selectedValue} onValueChange={(value) => onValueChange(String(value))}>
          {options.map((option) => (
            <Picker.Item key={option.value} color="#020617" label={option.label} value={option.value} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { color: '#cbd5e1', fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  pickerFrame: {
    backgroundColor: '#f8fafc',
    borderColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
