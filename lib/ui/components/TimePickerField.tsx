import * as React from 'react';
import 'timepicker-ui/main.css';
import 'timepicker-ui/theme-dark.css';

import { useMediaQuery } from '../../hooks/useMediaQuery';
import { Input } from '../9ui/input';
import { Popover, PopoverContent } from '../9ui/popover';
import { cn } from '../9ui/utils';
import {
  buildQuarterHourTimeOptions,
  formatTimePartsValue,
  formatTimeValue12h,
  parseUserTimeInput,
} from '../utils/datetime';

const desktopMediaQuery = '(min-width: 768px)';
const quarterHourOptions = buildQuarterHourTimeOptions();

export type TimePickerFieldProps = {
  id?: string;
  value: string;
  onChange: (nextTime: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  invalid?: boolean;
  name?: string;
  ariaLabel?: string;
};

function findHighlightedIndex(value: string) {
  if (!value) return 0;
  const exactMatchIndex = quarterHourOptions.findIndex(option => option.value === value);
  return exactMatchIndex >= 0 ? exactMatchIndex : 0;
}

function normalizeTimepickerValue(data: {
  hour?: string | number;
  minutes?: string | number;
  type?: string;
}) {
  const rawHour = Number(data.hour);
  const rawMinute = Number(data.minutes);
  const type = data.type?.toUpperCase();

  if (Number.isNaN(rawHour) || Number.isNaN(rawMinute)) {
    return '';
  }

  let hour = rawHour;
  if (type === 'PM' && hour < 12) hour += 12;
  if (type === 'AM' && hour === 12) hour = 0;

  return formatTimePartsValue(hour, rawMinute);
}

function MobileTimePickerField({
  id,
  value,
  onChange,
  required,
  disabled,
  placeholder,
  inputClassName,
  invalid,
  name,
  ariaLabel,
}: Omit<TimePickerFieldProps, 'className'> & { inputClassName: string }) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const instanceRef = React.useRef<any>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    let disposed = false;

    async function setup() {
      if (!hostRef.current) return;

      const [{ TimepickerUI }] = await Promise.all([import('timepicker-ui')]);
      if (disposed || !hostRef.current) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'tp-ui w-full';

      const input = document.createElement('input');
      input.type = 'text';
      input.readOnly = true;
      input.className = inputClassName;
      input.placeholder = placeholder ?? '';
      if (id) input.id = id;
      if (name) input.name = name;
      if (ariaLabel) input.setAttribute('aria-label', ariaLabel);
      if (invalid) input.setAttribute('aria-invalid', 'true');
      if (disabled) input.disabled = true;
      if (required) input.required = true;
      input.inputMode = 'none';

      wrapper.appendChild(input);
      hostRef.current.replaceChildren(wrapper);

      inputRef.current = input;

      const instance = new TimepickerUI(wrapper, {
        clock: { type: '12h' },
        ui: { mobile: true, theme: 'dark', mode: 'clock' },
      });

      instanceRef.current = instance;
      instance.create();
      if (value) {
        instance.setValue(formatTimeValue12h(value), true);
      }
      instance.on(
        'confirm',
        (data: { hour?: string | number; minutes?: string | number; type?: string }) => {
          const nextValue = normalizeTimepickerValue(data);
          if (nextValue) {
            onChange(nextValue);
          }
        }
      );
    }

    setup();

    return () => {
      disposed = true;
      const instance = instanceRef.current;
      instanceRef.current = null;
      inputRef.current = null;
      if (instance) {
        instance.destroy({ keepInputValue: true });
      }
      hostRef.current?.replaceChildren();
    };
  }, [
    ariaLabel,
    disabled,
    id,
    inputClassName,
    invalid,
    name,
    onChange,
    placeholder,
    required,
    value,
  ]);

  React.useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    input.disabled = Boolean(disabled);
    input.required = Boolean(required);
    if (invalid) {
      input.setAttribute('aria-invalid', 'true');
    } else {
      input.removeAttribute('aria-invalid');
    }
  }, [disabled, invalid, required]);

  React.useEffect(() => {
    const instance = instanceRef.current;
    if (!instance) return;

    if (!value) {
      const input = inputRef.current;
      if (input) input.value = '';
      return;
    }

    instance.setValue(formatTimeValue12h(value), true);
  }, [value]);

  return <div ref={hostRef} className="w-full" />;
}

export function TimePickerField({
  id,
  value,
  onChange,
  required,
  disabled,
  placeholder = 'Select time',
  className,
  invalid,
  name,
  ariaLabel,
}: TimePickerFieldProps) {
  const isDesktop = useMediaQuery(desktopMediaQuery);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(() => formatTimeValue12h(value));
  const [isEditing, setIsEditing] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(() => findHighlightedIndex(value));
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const optionRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const isEditingRef = React.useRef(isEditing);

  React.useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  React.useEffect(() => {
    if (isEditingRef.current) return;
    setInputValue(formatTimeValue12h(value));
    setHighlightedIndex(findHighlightedIndex(value));
  }, [value]);

  React.useEffect(() => {
    if (!open) return;
    const highlightedOption = optionRefs.current[highlightedIndex];
    if (highlightedOption && typeof highlightedOption.scrollIntoView === 'function') {
      highlightedOption.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, open]);

  const inputClassName = cn(
    'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-primary focus:outline-none',
    invalid && 'border-red-500 focus:border-red-500',
    className
  );

  const commitInputValue = React.useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setInputValue('');
      setHighlightedIndex(0);
      onChange('');
      setOpen(false);
      setIsEditing(false);
      return;
    }

    const parsed = parseUserTimeInput(trimmed);
    if (!parsed) {
      setInputValue('');
      setHighlightedIndex(0);
      onChange('');
      setOpen(false);
      setIsEditing(false);
      return;
    }

    setInputValue(formatTimeValue12h(parsed));
    setHighlightedIndex(findHighlightedIndex(parsed));
    onChange(parsed);
    setOpen(false);
    setIsEditing(false);
  }, [inputValue, onChange]);

  const selectOption = React.useCallback(
    (nextValue: string) => {
      setInputValue(formatTimeValue12h(nextValue));
      setHighlightedIndex(findHighlightedIndex(nextValue));
      setOpen(false);
      setIsEditing(false);
      onChange(nextValue);
    },
    [onChange]
  );

  const handleDesktopInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setInputValue(nextValue);
    setOpen(true);

    const parsed = parseUserTimeInput(nextValue);
    if (parsed) {
      onChange(parsed);
      setHighlightedIndex(findHighlightedIndex(parsed));
    }
  };

  const handleDesktopInputBlur = () => {
    window.setTimeout(() => {
      if (rootRef.current?.contains(document.activeElement)) {
        return;
      }
      commitInputValue();
    }, 0);
  };

  const handleDesktopInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex(prev => Math.min(prev + 1, quarterHourOptions.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (open) {
        selectOption(quarterHourOptions[highlightedIndex]?.value ?? value);
      } else {
        commitInputValue();
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setInputValue(formatTimeValue12h(value));
      setHighlightedIndex(findHighlightedIndex(value));
      setOpen(false);
      setIsEditing(false);
    }
  };

  if (!isDesktop) {
    return (
      <MobileTimePickerField
        id={id}
        name={name}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        ariaLabel={ariaLabel}
        invalid={invalid}
        inputClassName={inputClassName}
        onChange={onChange}
      />
    );
  }

  const parsedCurrentValue = parseUserTimeInput(inputValue);
  const activeValue = parsedCurrentValue ?? value;

  return (
    <Popover open={open} onOpenChange={setOpen} className="w-full">
      <div ref={rootRef} className="w-full">
        <Input
          id={id}
          name={name}
          type="text"
          autoComplete="off"
          value={inputValue}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          className={inputClassName}
          onFocus={() => {
            setIsEditing(true);
            setOpen(true);
            setHighlightedIndex(findHighlightedIndex(activeValue));
          }}
          onClick={() => setOpen(true)}
          onChange={handleDesktopInputChange}
          onBlur={handleDesktopInputBlur}
          onKeyDown={handleDesktopInputKeyDown}
        />

        <PopoverContent
          align="start"
          side="auto"
          sideOffset={6}
          className="w-full min-w-0 max-h-64 overflow-y-auto p-1"
        >
          <div role="listbox" aria-label="Time options" className="space-y-1">
            {quarterHourOptions.map((option, index) => {
              const isSelected = option.value === activeValue;
              const isHighlighted = index === highlightedIndex;

              return (
                <button
                  key={option.value}
                  ref={node => {
                    optionRefs.current[index] = node;
                  }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    'flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-white transition-colors',
                    isHighlighted ? 'bg-slate-700' : 'hover:bg-slate-800',
                    isSelected && !isHighlighted && 'bg-slate-800'
                  )}
                  onMouseDown={event => event.preventDefault()}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => selectOption(option.value)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </div>
    </Popover>
  );
}
