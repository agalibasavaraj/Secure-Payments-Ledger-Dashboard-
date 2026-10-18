import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../components/StatusBadge';

describe('StatusBadge Component', () => {
  it('renders SUCCESS with emerald/green styling', () => {
    render(<StatusBadge status="SUCCESS" />);
    const badge = screen.getByTestId('status-badge-success');
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain('SUCCESS');
    expect(badge.className).toContain('emerald');
  });

  it('renders FAILED with rose/red styling', () => {
    render(<StatusBadge status="FAILED" />);
    const badge = screen.getByTestId('status-badge-failed');
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain('FAILED');
    expect(badge.className).toContain('rose');
  });

  it('renders FLAGGED with amber styling', () => {
    render(<StatusBadge status="FLAGGED" />);
    const badge = screen.getByTestId('status-badge-flagged');
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain('FLAGGED');
    expect(badge.className).toContain('amber');
  });

  it('renders BLOCKED with dark red styling', () => {
    render(<StatusBadge status="BLOCKED" />);
    const badge = screen.getByTestId('status-badge-blocked');
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain('BLOCKED');
    expect(badge.className).toContain('red');
  });
});
