import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

import { TextField, type TextFieldProps } from '@/components/ui';

import { useFieldError } from './useFormError';

type Props<T extends FieldValues> = Omit<TextFieldProps, 'value' | 'onChangeText' | 'error'> & {
  control: Control<T>;
  name: FieldPath<T>;
};

/** TextField bound to React Hook Form. */
export function ControlledField<T extends FieldValues>({ control, name, ...rest }: Props<T>) {
  const fieldError = useFieldError();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur, ref }, fieldState }) => (
        <TextField
          ref={ref}
          value={value === undefined || value === null ? '' : String(value)}
          onChangeText={onChange}
          onBlur={onBlur}
          error={fieldError(fieldState.error)}
          {...rest}
        />
      )}
    />
  );
}
