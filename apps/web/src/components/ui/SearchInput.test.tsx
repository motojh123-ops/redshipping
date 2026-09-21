import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  it('renders with the default Arabic placeholder', () => {
    render(<SearchInput value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('بحث سريع...')).toBeInTheDocument();
  });

  it('debounces onChange instead of firing on every keystroke', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SearchInput value="" onChange={onChange} debounceMs={150} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'MSC');

    // Not called immediately during typing
    expect(onChange).not.toHaveBeenCalled();

    await waitFor(
      () => {
        expect(onChange).toHaveBeenCalledWith('MSC');
      },
      { timeout: 1000 },
    );

    // Debounced: exactly one call with the final value
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('fires immediately when the clear button is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SearchInput value="cargo" onChange={onChange} />);

    const clearButton = screen.getByRole('button');
    await user.click(clearButton);

    expect(onChange).toHaveBeenCalledWith('');
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('');
  });

  it('syncs back down when the controlled value prop changes', async () => {
    const { rerender } = render(<SearchInput value="first" onChange={vi.fn()} />);
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('first');

    rerender(<SearchInput value="second" onChange={vi.fn()} />);
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('second');
  });

  it('hides the clear button when the input is empty', () => {
    render(<SearchInput value="" onChange={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
