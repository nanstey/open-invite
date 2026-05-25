import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TimePickerField } from '../../lib/ui/components/TimePickerField';
import { formatTimeValue12h } from '../../lib/ui/utils/datetime';

const timepickerReactMock = vi.fn();

vi.mock('timepicker-ui-react', () => {
  return {
    Timepicker: (props: any) => {
      timepickerReactMock(props);
      return (
        <div data-testid="mock-timepicker-react">
          <input
            aria-label={props['aria-label']}
            aria-invalid={props['aria-invalid']}
            disabled={props.disabled}
            placeholder={props.placeholder}
            readOnly
            value={props.value ?? ''}
          />
          <button
            type="button"
            onClick={() => props.onConfirm?.({ hour: '4', minutes: '15', type: 'PM' })}
          >
            Confirm 4:15 PM
          </button>
          <button
            type="button"
            onClick={() => props.onConfirm?.({ hour: '6', minutes: '30', type: 'PM' })}
          >
            Confirm 6:30 PM
          </button>
        </div>
      );
    },
  };
});

function stubViewport(matchesDesktop: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(min-width: 768px)' ? matchesDesktop : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function TestHarness({ initialValue = '' }: { initialValue?: string }) {
  const [value, setValue] = React.useState(initialValue);

  return (
    <div>
      <TimePickerField value={value} onChange={setValue} ariaLabel="Time" />
      <button type="button" onClick={() => setValue('16:30')}>
        Set external value
      </button>
      <output data-testid="value">{value}</output>
    </div>
  );
}

describe('TimePickerField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('scrollTo', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('formats an initial HH:mm value for desktop display', () => {
    stubViewport(true);
    render(<TestHarness initialValue="14:30" />);

    expect(screen.getByLabelText('Time')).toHaveValue('2:30 PM');
    expect(screen.getByTestId('value')).toHaveTextContent('14:30');
  });

  it('parses shorthand desktop input and formats on blur', async () => {
    stubViewport(true);
    render(<TestHarness />);

    const input = screen.getByLabelText('Time');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '3p' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(input).toHaveValue('3:00 PM');
      expect(screen.getByTestId('value')).toHaveTextContent('15:00');
    });
  });

  it('preserves exact typed minutes on desktop blur', async () => {
    stubViewport(true);
    render(<TestHarness />);

    const input = screen.getByLabelText('Time');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '10:07pm' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(input).toHaveValue('10:07 PM');
      expect(screen.getByTestId('value')).toHaveTextContent('22:07');
    });
  });

  it('clears invalid desktop input on blur', async () => {
    stubViewport(true);
    render(<TestHarness initialValue="09:00" />);

    const input = screen.getByLabelText('Time');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'invalid' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(input).toHaveValue('');
      expect(screen.getByTestId('value')).toHaveTextContent('');
    });
  });

  it('selects a quarter-hour option from the desktop dropdown', async () => {
    stubViewport(true);
    render(<TestHarness />);

    const input = screen.getByLabelText('Time');
    fireEvent.click(input);
    fireEvent.click(screen.getByRole('option', { name: '10:00 AM' }));

    await waitFor(() => {
      expect(input).toHaveValue('10:00 AM');
      expect(screen.getByTestId('value')).toHaveTextContent('10:00');
    });
  });

  it('supports keyboard selection on desktop', async () => {
    stubViewport(true);
    render(<TestHarness />);

    const input = screen.getByLabelText('Time');
    fireEvent.click(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(input).toHaveValue('12:15 AM');
      expect(screen.getByTestId('value')).toHaveTextContent('00:15');
    });
  });

  it('syncs from parent value changes', async () => {
    stubViewport(true);
    render(<TestHarness initialValue="09:00" />);

    fireEvent.click(screen.getByRole('button', { name: 'Set external value' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Time')).toHaveValue('4:30 PM');
    });
  });

  it('renders mobile through timepicker-ui-react with scoped mobile theme options', async () => {
    stubViewport(false);
    render(<TestHarness initialValue="09:00" />);

    expect(screen.getByTestId('mock-timepicker-react')).toBeInTheDocument();
    expect(screen.getByLabelText('Time')).toHaveValue('9:00 AM');
    expect(timepickerReactMock).toHaveBeenCalled();
    expect(timepickerReactMock.mock.lastCall?.[0].options).toMatchObject({
      clock: { type: '12h' },
      ui: {
        theme: 'dark',
        mobile: true,
        mode: 'clock',
        enableSwitchIcon: true,
      },
      labels: {
        mobileTime: 'Time',
        cancel: 'Cancel',
        ok: 'Done',
      },
    });
    expect(timepickerReactMock.mock.lastCall?.[0].options.behavior.id).toContain(
      'open-invite-mobile-timepicker-'
    );
    expect(typeof timepickerReactMock.mock.lastCall?.[0].onOpen).toBe('function');

    fireEvent.click(screen.getByRole('button', { name: 'Confirm 4:15 PM' }));

    await waitFor(() => {
      expect(screen.getByTestId('value')).toHaveTextContent('16:15');
      expect(screen.getByLabelText('Time')).toHaveValue('4:15 PM');
    });
  });

  it('commits the confirmed mobile value from the wrapper', async () => {
    stubViewport(false);
    render(<TestHarness initialValue="09:00" />);

    fireEvent.click(screen.getByRole('button', { name: 'Confirm 6:30 PM' }));

    await waitFor(() => {
      expect(screen.getByTestId('value')).toHaveTextContent('18:30');
      expect(screen.getByLabelText('Time')).toHaveValue('6:30 PM');
    });
  });

  it('handles viewport switching without crashing', async () => {
    let matchesDesktop = false;
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(min-width: 768px)' ? matchesDesktop : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { rerender } = render(<TestHarness initialValue="09:00" />);
    expect(screen.getByLabelText('Time')).toHaveValue(formatTimeValue12h('09:00'));

    matchesDesktop = true;
    rerender(<TestHarness initialValue="09:00" />);

    await waitFor(() => {
      expect(screen.getByLabelText('Time')).toHaveValue('9:00 AM');
    });
  });
});
