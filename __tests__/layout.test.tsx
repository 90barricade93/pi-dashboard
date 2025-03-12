import React from 'react';
import { render, screen, cleanup } from './test-utils';
import RootLayout from '../app/layout';
import { metadata } from '../app/layout';

describe('RootLayout', () => {
  // Cleanup after each test
  afterEach(() => {
    cleanup();
  });

  it('renders children correctly', () => {
    render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    );
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders header and footer', () => {
    render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );
    
    // Check header elements
    expect(screen.getByText('90barricade93 Pi Dashboard')).toBeInTheDocument();
    
    // Check footer elements
    expect(screen.getByText(/© \d{4}/)).toBeInTheDocument();
  });

  it('has correct metadata', () => {
    expect(metadata.title).toBe('Pi Network Dashboard');
    expect(metadata.description).toBe('Track Pi cryptocurrency prices, news, and network statistics');
  });

  it('applies the correct font class', () => {
    render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );
    
    const body = document.querySelector('body');
    expect(body).toHaveClass('inter');
  });

  it('renders with language attribute', () => {
    render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );
    
    const html = document.querySelector('html');
    expect(html).toHaveAttribute('lang', 'en');
  });
}); 