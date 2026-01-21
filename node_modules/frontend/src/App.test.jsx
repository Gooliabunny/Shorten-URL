import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App';

describe('App Component', () => {
  beforeEach(() => {
    // Mock fetch before each test
    global.fetch = vi.fn();
  });

  afterEach(() => {
    // Clear mock after each test
    vi.clearAllMocks();
  });

  it('renders the URL shortener form', () => {
    render(<App />);
    
    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button');
    
    expect(input).toBeInTheDocument();
    expect(button).toBeInTheDocument();
  });

  it('creates short URL successfully', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => 'abc123',
    });

    render(<App />);
    
    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button');
    
    fireEvent.change(input, { target: { value: 'https://google.com' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 'https://google.com' }),
      });
    });
  });

  it('handles API errors', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<App />);
    
    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button');
    
    fireEvent.change(input, { target: { value: 'https://google.com' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});