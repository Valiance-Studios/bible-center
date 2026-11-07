import classes from './FilterButtons.module.scss';

export interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface FilterButtonsProps<T extends string> {
  /** Names the group for screen readers, such as "Show". */
  label: string;
  options: readonly FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** A row of pill buttons choosing one of a few views, such as My verses' types or Review's tabs. */
export function FilterButtons<T extends string>({label, options, value, onChange, className}: FilterButtonsProps<T>) {
  return (
    <div className={className ? `${classes.filters} ${className}` : classes.filters} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === value ? classes.filterOn : classes.filter}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
