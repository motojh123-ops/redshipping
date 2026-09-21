import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders the Arabic label for a known shipment stage', () => {
    render(<StatusBadge status="delivered" />);
    expect(screen.getByText('تم التسليم')).toBeInTheDocument();
  });

  it('renders invoice statuses with their labels', () => {
    render(<StatusBadge status="partially_paid" />);
    expect(screen.getByText('مدفوع جزئياً')).toBeInTheDocument();
  });

  it('falls back to the raw status string for unknown statuses', () => {
    render(<StatusBadge status="totally_unknown_status" />);
    expect(screen.getByText('totally_unknown_status')).toBeInTheDocument();
  });

  it('shows the colored dot by default', () => {
    const { container } = render(<StatusBadge status="active" />);
    expect(container.querySelector('span.w-1\\.5')).toBeInTheDocument();
  });

  it('hides the dot when showDot is false', () => {
    const { container } = render(<StatusBadge status="active" showDot={false} />);
    expect(container.querySelector('span.w-1\\.5')).toBeNull();
  });

  it('applies success styling to the paid status', () => {
    render(<StatusBadge status="paid" />);
    const badge = screen.getByText('مدفوعة بالكامل').closest('span');
    expect(badge?.className).toContain('emerald');
  });

  it('applies danger styling to overdue invoices', () => {
    render(<StatusBadge status="overdue" />);
    const badge = screen.getByText('متأخرة السداد').closest('span');
    expect(badge?.className).toContain('rose');
  });

  it('appends a custom className', () => {
    render(<StatusBadge status="active" className="my-extra-class" />);
    const badge = screen.getByText('نشط').closest('span');
    expect(badge?.className).toContain('my-extra-class');
  });
});
