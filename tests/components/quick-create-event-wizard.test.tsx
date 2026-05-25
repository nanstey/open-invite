import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuickCreateEventWizard } from '../../domains/events/components/create/QuickCreateEventWizard';
import { createDraftEvent } from '../../services/eventService';

vi.mock('../../services/eventService', () => ({
  createDraftEvent: vi.fn(),
}));

function stubDesktopViewport() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function stubMobileViewport() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

describe('QuickCreateEventWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubDesktopViewport();
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.stubGlobal('scrollTo', vi.fn());
    vi.mocked(createDraftEvent).mockResolvedValue({
      id: 'event-1',
      slug: 'board-games-20260516-event1',
      hostId: 'host-1',
      publishedAt: null,
      title: 'Board games',
      description: '',
      activityType: 'Social',
      location: '',
      startTime: '2026-05-16T19:00:00.000Z',
      endTime: '2026-05-16T21:00:00.000Z',
      isAllDay: false,
      isFlexibleStart: false,
      isFlexibleEnd: false,
      visibilityType: 'INVITE_ONLY' as any,
      groupIds: [],
      allowFriendInvites: false,
      attendees: [],
      noPhones: false,
      itineraryTimeDisplay: 'START_AND_END',
      comments: [],
      reactions: {},
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders as a controlled create invite overlay', () => {
    render(<QuickCreateEventWizard open onOpenChange={vi.fn()} onCreated={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Add title')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.queryByText(/start with the basics/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument();
  });

  it('renders categories in the updated order and allows selecting Music', () => {
    render(<QuickCreateEventWizard open onOpenChange={vi.fn()} onCreated={vi.fn()} />);

    const categoryButtons = screen
      .getAllByRole('button')
      .filter(button =>
        ['Social', 'Food', 'Music', 'Entertainment', 'Sport', 'Work', 'Travel', 'Errand'].includes(
          button.textContent ?? ''
        )
      );

    expect(categoryButtons.map(button => button.textContent)).toEqual([
      'Social',
      'Food',
      'Music',
      'Entertainment',
      'Sport',
      'Work',
      'Travel',
      'Errand',
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Music' }));

    expect(screen.getByRole('button', { name: 'Music' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('saves all-day events with boundary timestamps and the all-day flag', async () => {
    const onCreated = vi.fn();
    render(<QuickCreateEventWizard open onOpenChange={vi.fn()} onCreated={onCreated} />);

    const today = new Date().toISOString().slice(0, 10);
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Park day' } });
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(createDraftEvent).toHaveBeenCalled());
    expect(createDraftEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Park day',
        isAllDay: true,
        startTime: new Date(`${today}T00:00:00`).toISOString(),
        endTime: new Date(`${today}T23:59:00`).toISOString(),
      })
    );
    expect(onCreated).toHaveBeenCalled();
  });

  it('requires the end time to be after the start time', () => {
    render(<QuickCreateEventWizard open onOpenChange={vi.fn()} onCreated={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Dinner' } });
    fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '14:00' } });
    fireEvent.change(screen.getByLabelText('End time'), { target: { value: '13:00' } });

    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('asks for confirmation before discarding dirty input', () => {
    const onOpenChange = vi.fn();
    render(<QuickCreateEventWizard open onOpenChange={onOpenChange} onCreated={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Unfinished' } });
    fireEvent.click(screen.getByRole('button', { name: /close create invite/i }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByRole('button', { name: /discard invite/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keeps the nested mobile start-date picker above the drawer and restores drawer control on close', async () => {
    stubMobileViewport();

    const { rerender } = render(
      <QuickCreateEventWizard open onOpenChange={vi.fn()} onCreated={vi.fn()} />
    );

    await waitFor(() => {
      expect(document.body.style.overflow).toBe('hidden');
    });

    const drawer = document.querySelector('[data-slot="drawer-content"]');
    expect(drawer).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start date' }));
    await waitFor(() =>
      expect(document.querySelector('[data-slot="dialog-content"]')).toBeInTheDocument()
    );
    const dialog = document.querySelector('[data-slot="dialog-content"]') as HTMLElement;
    expect(within(dialog).getByRole('button', { name: /close date picker/i })).toBeInTheDocument();
    expect(document.querySelector('[data-slot="dialog-positioner"]')).toHaveClass('z-[1100]');
    expect(document.body.style.overflow).toBe('hidden');

    const closeDatePicker = within(dialog).getByRole('button', { name: /close date picker/i });
    fireEvent.click(closeDatePicker);

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /close date picker/i })).not.toBeInTheDocument()
    );

    expect(document.querySelector('[data-slot="drawer-content"]')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();

    rerender(<QuickCreateEventWizard open={false} onOpenChange={vi.fn()} onCreated={vi.fn()} />);

    await waitFor(() => {
      expect(document.body.style.overflow).toBe('');
    });
  });
});
