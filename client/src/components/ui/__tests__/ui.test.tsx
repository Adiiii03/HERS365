import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';
import { Badge } from '../Badge';
import { EmptyState } from '../EmptyState';
import { tokens } from '../../../lib/tokens';

describe('Button', () => {
  it('renders a 44px min-height in every size', () => {
    const { rerender } = render(<Button size="sm">Go</Button>);
    let btn = screen.getByRole('button', { name: 'Go' });
    expect(btn.style.minHeight).toBe('44px');

    rerender(<Button size="md">Go</Button>);
    btn = screen.getByRole('button', { name: 'Go' });
    expect(btn.style.minHeight).toBe('44px');

    rerender(<Button size="lg">Go</Button>);
    btn = screen.getByRole('button', { name: 'Go' });
    expect(btn.style.minHeight).toBe('44px');
  });

  it('fires onClick when pressed', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Tap</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Tap' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('carries a focus-visible ring class', () => {
    render(<Button>Focus</Button>);
    const btn = screen.getByRole('button', { name: 'Focus' });
    expect(btn.className).toContain('focus-visible:ring-2');
  });

  it('does not fire onClick while loading (disabled)', () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} loading>
        Load
      </Button>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Badge', () => {
  it('applies the accent tone classes', () => {
    render(<Badge tone="accent">New</Badge>);
    const badge = screen.getByText('New');
    expect(badge.className).toContain('rgba(139,59,255,0.1)');
    expect(badge.className).toContain('#C4A3FF');
  });

  it('applies the neon tone classes (verified/live only)', () => {
    render(<Badge tone="neon">Live</Badge>);
    const badge = screen.getByText('Live');
    expect(badge.className).toContain('#39FF14');
  });

  it('defaults to the neutral tone', () => {
    render(<Badge>Draft</Badge>);
    const badge = screen.getByText('Draft');
    expect(badge.className).toContain('#A0A0AB');
  });
});

describe('EmptyState', () => {
  it('renders title, body, and cta', () => {
    render(
      <EmptyState
        icon={<svg data-testid="icon" />}
        title="Nothing here"
        body="Add your first athlete to get started."
        cta={<button>Add athlete</button>}
      />,
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('Add your first athlete to get started.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add athlete' })).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders without a body or cta', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.getByText('Empty')).toBeInTheDocument();
  });
});

describe('tokens', () => {
  it('exposes the frozen brand palette and expected shape', () => {
    expect(tokens.colors.accent).toBe('#8B3BFF');
    expect(tokens.colors.pink).toBe('#FF2E93');
    expect(tokens.colors.neon).toBe('#39FF14');
    expect(tokens.colors.surface0).toBe('#0A0A0C');
    expect(tokens.colors.surface1).toBe('#121216');

    expect(Object.keys(tokens)).toEqual([
      'colors',
      'text',
      'type',
      'radii',
      'spacing',
      'elevation',
    ]);
    expect(tokens.type.font.display).toBe("'Barlow Condensed', sans-serif");
    expect(tokens.radii.md).toBe('12px');
  });
});
