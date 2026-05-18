import { DatePickerField } from './DatePickerField';
import { TimePickerField } from './TimePickerField';

type Size = 'lg' | 'compact';

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function inputPadding(size: Size | undefined) {
  switch (size) {
    case 'compact':
      return 'py-2.5 px-3';
    default:
      return 'py-3 px-4';
  }
}

export type DateTimeFieldsProps = {
  date: string;
  time: string;
  durationHours: number | '';
  timeOptions: Array<{ value: string; label: string }>;

  onChangeDate: (nextDate: string) => void;
  onChangeTime: (nextTime: string) => void;
  onChangeDurationHours: (next: number | '') => void;

  required?: boolean;
  size?: Size;

  minDurationHours?: number;
  durationStepHours?: number;
  durationPlaceholder?: string;

  invalidStartTime?: boolean;
  invalidDuration?: boolean;
  durationErrorText?: string;
};

export function DateTimeFields(props: DateTimeFieldsProps) {
  const {
    date,
    time,
    durationHours,
    onChangeDate,
    onChangeTime,
    onChangeDurationHours,
    required,
    size = 'lg',
    minDurationHours = 0.25,
    durationStepHours = 0.25,
    durationPlaceholder = 'e.g. 2',
    invalidStartTime,
    invalidDuration,
    durationErrorText,
  } = props;

  const inputBase = cx(
    'w-full bg-slate-900 border rounded-lg text-white outline-none border-slate-700 focus:border-primary',
    inputPadding(size)
  );

  const inputInvalid = 'border-red-500 focus:border-red-500';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="space-y-1">
        <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Date</div>
        <DatePickerField
          value={date}
          onChange={onChangeDate}
          required={required}
          invalid={invalidStartTime}
          className={cx(inputBase, '[color-scheme:dark]', invalidStartTime && inputInvalid)}
        />
      </div>

      <div className="space-y-1">
        <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Time</div>
        <TimePickerField
          value={time}
          onChange={onChangeTime}
          required={required}
          placeholder="Select time"
          ariaLabel="Time"
          className={invalidStartTime ? inputInvalid : undefined}
          invalid={invalidStartTime}
        />
      </div>

      <div className="space-y-1">
        <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
          Duration (hours)
        </div>
        <input
          type="number"
          min={minDurationHours}
          step={durationStepHours}
          value={durationHours}
          onChange={e => {
            const raw = e.target.value;
            const next = raw === '' ? '' : Number(raw);
            onChangeDurationHours(next === '' ? '' : next);
          }}
          placeholder={durationPlaceholder}
          required={required}
          className={cx(inputBase, invalidDuration && inputInvalid)}
        />
        {durationErrorText ? (
          <div className="text-xs text-red-400 mt-1">{durationErrorText}</div>
        ) : null}
      </div>
    </div>
  );
}
