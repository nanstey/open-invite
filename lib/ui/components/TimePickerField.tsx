import * as React from 'react';
import 'timepicker-ui/main.css';
import 'timepicker-ui/theme-dark.css';
import type { TimepickerOptions } from 'timepicker-ui';
import { Timepicker } from 'timepicker-ui-react';
import './timepicker-ui-overrides.css';

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
  label?: string;
};

type TimeTextEntryPanelProps = {
  id?: string;
  value: string;
  disabled?: boolean;
  required?: boolean;
  placeholder: string;
  invalid?: boolean;
  name?: string;
  ariaLabel?: string;
  inputClassName: string;
  mobilePanel?: boolean;
  onCommitValue?: () => void;
  onDraftChange: (nextTime: string) => void;
};

function findHighlightedIndex(value: string) {
  if (!value) return 0;
  const exactMatchIndex = quarterHourOptions.findIndex(option => option.value === value);
  return exactMatchIndex >= 0 ? exactMatchIndex : 0;
}

function TimeOptionsList({
  activeValue,
  highlightedIndex,
  optionRefs,
  onHighlight,
  onSelect,
  optionClassName,
}: {
  activeValue: string;
  highlightedIndex: number;
  optionRefs: React.MutableRefObject<Array<HTMLButtonElement | null>>;
  onHighlight: (index: number) => void;
  onSelect: (nextValue: string) => void;
  optionClassName?: string;
}) {
  return (
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
              isSelected && !isHighlighted && 'bg-slate-800',
              optionClassName
            )}
            onMouseDown={event => event.preventDefault()}
            onMouseEnter={() => onHighlight(index)}
            onClick={() => onSelect(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function TimeTextEntryPanel({
  id,
  value,
  disabled,
  required,
  placeholder,
  invalid,
  name,
  ariaLabel,
  inputClassName,
  mobilePanel = false,
  onCommitValue,
  onDraftChange,
}: TimeTextEntryPanelProps) {
  const [inputValue, setInputValue] = React.useState(() => formatTimeValue12h(value));
  const [open, setOpen] = React.useState(mobilePanel);
  const [highlightedIndex, setHighlightedIndex] = React.useState(() => findHighlightedIndex(value));
  const optionRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const isEditingRef = React.useRef(false);

  React.useEffect(() => {
    if (isEditingRef.current) return;
    setInputValue(formatTimeValue12h(value));
    setHighlightedIndex(findHighlightedIndex(value));
  }, [value]);

  React.useEffect(() => {
    setOpen(mobilePanel);
  }, [mobilePanel]);

  React.useEffect(() => {
    if (!open) return;
    const highlightedOption = optionRefs.current[highlightedIndex];
    highlightedOption?.scrollIntoView?.({ block: 'nearest' });
  }, [highlightedIndex, open]);

  const normalizeInput = React.useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setInputValue('');
      setHighlightedIndex(0);
      onDraftChange('');
      return '';
    }

    const parsed = parseUserTimeInput(trimmed);
    if (!parsed) {
      setInputValue('');
      setHighlightedIndex(0);
      onDraftChange('');
      return '';
    }

    const formatted = formatTimeValue12h(parsed);
    setInputValue(formatted);
    setHighlightedIndex(findHighlightedIndex(parsed));
    onDraftChange(parsed);
    return parsed;
  }, [inputValue, onDraftChange]);

  const selectOption = React.useCallback(
    (nextValue: string) => {
      isEditingRef.current = false;
      setInputValue(formatTimeValue12h(nextValue));
      setHighlightedIndex(findHighlightedIndex(nextValue));
      onDraftChange(nextValue);
      if (!mobilePanel) {
        setOpen(false);
      }
    },
    [mobilePanel, onDraftChange]
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    isEditingRef.current = true;
    setInputValue(nextValue);
    setOpen(true);

    const parsed = parseUserTimeInput(nextValue);
    if (parsed) {
      onDraftChange(parsed);
      setHighlightedIndex(findHighlightedIndex(parsed));
    }
  };

  const handleInputBlur = () => {
    window.setTimeout(() => {
      if (rootRef.current?.contains(document.activeElement)) return;
      isEditingRef.current = false;
      normalizeInput();
      if (!mobilePanel) {
        setOpen(false);
      }
    }, 0);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
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
        isEditingRef.current = false;
        normalizeInput();
      }
      onCommitValue?.();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      isEditingRef.current = false;
      setInputValue(formatTimeValue12h(value));
      setHighlightedIndex(findHighlightedIndex(value));
      if (!mobilePanel) {
        setOpen(false);
      }
    }
  };

  const parsedCurrentValue = parseUserTimeInput(inputValue);
  const activeValue = parsedCurrentValue ?? value;
  const options = (
    <TimeOptionsList
      activeValue={activeValue}
      highlightedIndex={highlightedIndex}
      optionRefs={optionRefs}
      onHighlight={setHighlightedIndex}
      onSelect={selectOption}
    />
  );

  const input = (
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
        setOpen(true);
        setHighlightedIndex(findHighlightedIndex(activeValue));
      }}
      onClick={() => setOpen(true)}
      onChange={handleInputChange}
      onBlur={handleInputBlur}
      onKeyDown={handleInputKeyDown}
    />
  );

  if (mobilePanel) {
    return (
      <div ref={rootRef} className="w-full">
        {input}
        <div className="mt-4 max-h-72 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 p-1">
          {options}
        </div>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen} className="w-full">
      <div ref={rootRef} className="w-full">
        {input}
        <PopoverContent
          align="start"
          side="auto"
          sideOffset={6}
          className="w-full min-w-0 max-h-64 overflow-y-auto p-1"
        >
          {options}
        </PopoverContent>
      </div>
    </Popover>
  );
}

function MobileTimePickerField({
  id,
  value,
  required,
  disabled,
  placeholder,
  inputClassName,
  invalid,
  name,
  ariaLabel,
  label = 'Time',
  onChange,
}: Omit<TimePickerFieldProps, 'className'> & { inputClassName: string }) {
  const displayedValue = value ? formatTimeValue12h(value) : '';
  const instanceId = React.useId().replace(/:/g, '-');
  const ownerId = `open-invite-mobile-timepicker-${instanceId}`;
  const options = React.useMemo(
    (): TimepickerOptions => ({
      clock: { type: '12h' as const, incrementMinutes: 5, autoSwitchToMinutes: true },
      ui: {
        theme: 'dark' as const,
        mobile: true,
        mode: 'clock' as const,
        enableSwitchIcon: true,
      },
      labels: {
        mobileTime: label,
        cancel: 'Cancel',
        ok: 'Done',
      },
      behavior: {
        id: ownerId,
      },
    }),
    [label, ownerId]
  );

  const handleOpen = React.useCallback(() => {
    window.setTimeout(() => {
      const modal = document.querySelector(`[data-owner-id="${ownerId}"]`);
      const wrapper = modal?.querySelector('.tp-ui-wrapper');
      const switchButton = modal?.querySelector<HTMLElement>('.tp-ui-keyboard-icon-wrapper');
      const selectTimeEl = modal?.querySelector('.tp-ui-select-time');

      if (selectTimeEl) {
        selectTimeEl.textContent = label;
      }

      if (!modal || !wrapper || !switchButton || wrapper.classList.contains('expanded')) {
        return;
      }

      switchButton.click();
    }, 0);
  }, [label, ownerId]);

  const handleConfirm = React.useCallback(
    (data: { hour?: string | number; minutes?: string | number; type?: string }) => {
      const rawHour = Number(data.hour);
      const rawMinute = Number(data.minutes);
      const type = data.type?.toUpperCase();

      if (Number.isNaN(rawHour) || Number.isNaN(rawMinute)) {
        onChange('');
        return;
      }

      let hour = rawHour;
      if (type === 'PM' && hour < 12) hour += 12;
      if (type === 'AM' && hour === 12) hour = 0;

      onChange(formatTimePartsValue(hour, rawMinute));
    },
    [onChange]
  );

  // timepicker-ui wraps the underlying <input> in its own `.tp-ui` div by
  // re-parenting the node (insertBefore + appendChild). If that <input> is the
  // root DOM node React owns, React's unmount tries to remove it from its
  // original parent and throws `NotFoundError` (crashing the app when e.g. the
  // All Day toggle unmounts this field). Rendering a stable wrapper <div> that
  // React owns keeps the re-parented input safely nested, so unmount removes
  // the wrapper instead.
  return (
    <div className="h-full w-full">
      <Timepicker
        id={id}
        name={name}
        value={displayedValue}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        className={inputClassName}
        options={options}
        onOpen={handleOpen}
        onConfirm={handleConfirm}
      />
    </div>
  );
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
  label,
}: TimePickerFieldProps) {
  const isDesktop = useMediaQuery(desktopMediaQuery);
  const inputClassName = cn(
    'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-primary focus:outline-none',
    invalid && 'border-red-500 focus:border-red-500',
    className
  );

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
        label={label}
        inputClassName={inputClassName}
        onChange={onChange}
      />
    );
  }

  return (
    <TimeTextEntryPanel
      id={id}
      name={name}
      value={value}
      onDraftChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      ariaLabel={ariaLabel}
      invalid={invalid}
      inputClassName={inputClassName}
      mobilePanel={false}
    />
  );
}
