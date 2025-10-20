import React from 'react';
import { TextInput, Text, View, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { formatNumberInput } from '../../utils/numberFormat';

interface NumericInputProps extends Omit<TextInputProps, 'onChangeText' | 'keyboardType'> {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  onChangeText: (value: string) => void;
  maxDecimalPlaces?: number;
}

const NumericInput: React.FC<NumericInputProps> = ({
  label,
  error,
  containerStyle,
  style,
  onChangeText,
  maxDecimalPlaces = 2,
  value,
  ...props
}) => {
  const handleChange = (text: string) => {
    // Formata o input removendo vírgulas e permitindo apenas pontos
    const formatted = formatNumberInput(text, maxDecimalPlaces);
    onChangeText(formatted);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor="#8E8E93"
        keyboardType="decimal-pad"
        value={value}
        onChangeText={handleChange}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1C1C1E',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 4,
  },
});

export default NumericInput;

