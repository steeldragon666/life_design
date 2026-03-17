import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import VoiceSettingsPanel from '../VoiceSettingsPanel';

// Mock useElevenLabsTTS
vi.mock('@/hooks/useElevenLabsTTS', () => ({
  useElevenLabsTTS: () => ({
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    isSpeaking: false,
    isLoading: false,
    error: null,
  }),
}));

describe('VoiceSettingsPanel', () => {
  it('renders voice toggle', () => {
    render(<VoiceSettingsPanel />);
    expect(screen.getByText('Speak mentor responses aloud')).toBeDefined();
  });

  it('renders auto-speak toggle', () => {
    render(<VoiceSettingsPanel />);
    expect(screen.getByText('Auto-speak in voice conversations')).toBeDefined();
  });

  it('renders speed slider', () => {
    render(<VoiceSettingsPanel />);
    expect(screen.getByText(/voice speed/i)).toBeDefined();
  });

  it('renders preview buttons for all three mentors', () => {
    render(<VoiceSettingsPanel />);
    expect(screen.getByLabelText(/preview eleanor/i)).toBeDefined();
    expect(screen.getByLabelText(/preview theo/i)).toBeDefined();
    expect(screen.getByLabelText(/preview maya/i)).toBeDefined();
  });

  it('renders data usage note', () => {
    render(<VoiceSettingsPanel />);
    expect(screen.getByText(/50–100KB/)).toBeDefined();
  });
});
