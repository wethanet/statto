import type { ThemePreference } from '@web/lib/theme';

type ThemeOptionRowProps = {
  label: string;
  description: string;
  value: ThemePreference;
  selectedValue: ThemePreference;
  onPress: (value: ThemePreference) => void;
};

export function ThemeOptionRow({
  label,
  description,
  value,
  selectedValue,
  onPress,
}: ThemeOptionRowProps) {
  const isSelected = value === selectedValue;

  return (
    <button
      className={isSelected ? 'option-row option-row--selected' : 'option-row'}
      onClick={() => onPress(value)}
      type="button">
      <span className="option-row__copy">
        <strong>{label}</strong>
        <span className="muted">{description}</span>
      </span>
      <span
        className={
          isSelected ? 'option-row__indicator option-row__indicator--selected' : 'option-row__indicator'
        }
      />
    </button>
  );
}
