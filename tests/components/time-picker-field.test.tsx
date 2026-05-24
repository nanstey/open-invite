import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TimePickerField } from '../../lib/ui/components/TimePickerField';
import { formatTimeValue12h } from '../../lib/ui/utils/datetime';

vi.mock('timepicker-ui', () => {
  class MockTimepickerUI {
    wrapper: HTMLElement;
    handlers = new Map<string, (data: any) => void>();
    constructor(wrapper: HTMLElement) {
      this.wrapper = wrapper;
    }
    create() {
      const confirmButton = document.createElement('button');
      confirmButton.type = 'button';
      confirmButton.textContent = 'Confirm mobile time';
      confirmButton.addEventListener('click', () => {
        this.handlers.get('confirm')?.({ hour: '4', minutes: '15', type: 'PM' });
      });

      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.textContent = 'Cancel mobile time';
      cancelButton.addEventListener('click', () => {
        this.handlers.get('cancel')?.({});
      });

      this.wrapper.appendChild(confirmButton);
      this.wrapper.appendChild(cancelButton);
    }
    on(event: string, handler: (data: any) => void) {
      this.handlers.set(event, handler);
    }
    setValue(value: string) {
      const input = this.wrapper.querySelector('input');
      if (input) {
        input.value = value;
      }
    }
    destroy() {
      this.wrapper.querySelectorAll('button').forEach(button => {
        button.remove();
      });
    }
  }

  return { TimepickerUI: MockTimepickerUI };
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

  it('uses the mobile timepicker and commits on confirm only', async () => {
    stubViewport(false);
    render(<TestHarness initialValue="09:00" />);

    expect(await screen.findByLabelText('Time')).toHaveValue('9:00 AM');
    expect(await screen.findByRole('button', { name: 'Confirm mobile time' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm mobile time' }));

    await waitFor(() => {
      expect(screen.getByTestId('value')).toHaveTextContent('16:15');
      expect(screen.getByLabelText('Time')).toHaveValue('4:15 PM');
    });
  });

  it('keeps the current value on mobile cancel', async () => {
    stubViewport(false);
    render(<TestHarness initialValue="09:00" />);

    expect(await screen.findByRole('button', { name: 'Cancel mobile time' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel mobile time' }));

    expect(screen.getByTestId('value')).toHaveTextContent('09:00');
    expect(screen.getByLabelText('Time')).toHaveValue('9:00 AM');
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
    expect(await screen.findByLabelText('Time')).toHaveValue(formatTimeValue12h('09:00'));

    matchesDesktop = true;
    rerender(<TestHarness initialValue="09:00" />);

    await waitFor(() => {
      expect(screen.getByLabelText('Time')).toHaveValue('9:00 AM');
    });
  });
});
