import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Drawer, DrawerContent, DrawerTitle } from '../../lib/ui/9ui/drawer';
import { DatePickerField } from '../../lib/ui/components/DatePickerField';

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

function TestHarness({ initialValue = '2026-05-10' }: { initialValue?: string }) {
  const [value, setValue] = React.useState(initialValue);

  return (
    <div>
      <DatePickerField value={value} onChange={setValue} />
      <output data-testid="value">{value}</output>
    </div>
  );
}

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

function DrawerHarness({ initialValue = '2026-05-10' }: { initialValue?: string }) {
  const [value, setValue] = React.useState(initialValue);

  return (
    <Drawer open>
      <DrawerContent>
        <div className="sr-only">
          <DrawerTitle>Create an invite</DrawerTitle>
        </div>
        <DatePickerField value={value} onChange={setValue} />
        <output data-testid="value">{value}</output>
      </DrawerContent>
    </Drawer>
  );
}

describe('DatePickerField', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.stubGlobal('scrollTo', vi.fn());
  });

  it('uses a popover calendar on desktop', async () => {
    stubViewport(true);
    render(<TestHarness />);

    fireEvent.click(screen.getByRole('button', { name: /may 10, 2026/i }));

    expect(await screen.findByText('May 2026')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('uses a dialog calendar on mobile and commits selection only on done', async () => {
    stubViewport(false);
    render(<DrawerHarness />);

    fireEvent.click(screen.getByRole('button', { name: /may 10, 2026/i }));

    await waitFor(() =>
      expect(document.querySelector('[data-slot="dialog-content"]')).toBeInTheDocument()
    );
    const dialog = document.querySelector('[data-slot="dialog-content"]') as HTMLElement;
    expect(within(dialog).getByText('May 2026')).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: /close date picker/i })
    ).not.toBeInTheDocument();
    expect(document.querySelector('[data-slot="drawer-content"]')).toHaveClass('z-[1001]');
    expect(document.querySelector('[data-slot="dialog-positioner"]')).toHaveClass('z-[1100]');

    fireEvent.click(within(dialog).getByRole('button', { name: /friday, may 15th, 2026/i }));

    expect(screen.getByTestId('value')).toHaveTextContent('2026-05-10');
    expect(within(dialog).getByText('May 15, 2026')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: /done/i }));

    await waitFor(() => {
      expect(screen.getByTestId('value')).toHaveTextContent('2026-05-15');
      expect(document.querySelector('[data-slot="dialog-content"]')).not.toBeInTheDocument();
    });

    expect(document.querySelector('[data-slot="drawer-content"]')).toBeInTheDocument();
  });

  it('cancels a mobile draft date selection', async () => {
    stubViewport(false);
    render(<DrawerHarness />);

    fireEvent.click(screen.getByRole('button', { name: /may 10, 2026/i }));

    await waitFor(() =>
      expect(document.querySelector('[data-slot="dialog-content"]')).toBeInTheDocument()
    );
    const dialog = document.querySelector('[data-slot="dialog-content"]') as HTMLElement;

    fireEvent.click(within(dialog).getByRole('button', { name: /friday, may 15th, 2026/i }));
    expect(within(dialog).getByText('May 15, 2026')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.getByTestId('value')).toHaveTextContent('2026-05-10');
      expect(document.querySelector('[data-slot="dialog-content"]')).not.toBeInTheDocument();
    });
  });
});
