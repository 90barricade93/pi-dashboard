import React from 'react';
import { render, screen, fireEvent, cleanup } from './test-utils';
import Footer from '../components/footer';

describe('Footer', () => {
  // Cleanup after each test
  afterEach(() => {
    cleanup();
  });

  it('renders the footer with logo and brand name', () => {
    render(<Footer />);

    expect(screen.getByText('Pi Dashboard')).toBeInTheDocument();
    expect(screen.getByText('π')).toBeInTheDocument();
  });

  it('renders the resources section', () => {
    render(<Footer />);

    expect(screen.getByText('Resources')).toBeInTheDocument();
    expect(screen.getByText('Developers')).toBeInTheDocument();
    expect(screen.getByText('Pi Whitepaper')).toBeInTheDocument();
    expect(screen.getByText('Roadmap')).toBeInTheDocument();
  });

  it('renders the connect section', () => {
    render(<Footer />);

    expect(screen.getByText('Connect')).toBeInTheDocument();
    expect(screen.getByText('Created by Raymond de Vries')).toBeInTheDocument();
    expect(screen.getByText('Subscribe to our newsletter for updates')).toBeInTheDocument();
  });

  it('renders the copyright notice', () => {
    render(<Footer />);

    expect(screen.getByText(/©/)).toBeInTheDocument();
    expect(screen.getByText('90barricade93 Pi Dashboard')).toBeInTheDocument();
  });

  it('renders and tests resource links', () => {
    render(<Footer />);

    const links = [
      { text: 'Developers', href: '/developers' },
      { text: 'Pi Whitepaper', href: '/whitepaper' },
      { text: 'Roadmap', href: '/roadmap' },
    ];

    links.forEach(({ text, href }) => {
      const link = screen.getByRole('link', { name: text });
      expect(link).toBeInTheDocument();
      expect(link.getAttribute('href')).toBe(href);
    });
  });

  it('renders and tests social media links', () => {
    render(<Footer />);

    const twitterLink = screen.getByRole('link', { name: /twitter/i });
    const linkedinLink = screen.getByRole('link', { name: /linkedin/i });

    expect(twitterLink).toBeInTheDocument();
    expect(twitterLink.getAttribute('href')).toBe('https://twitter.com/Vries_de_R');
    expect(linkedinLink).toBeInTheDocument();
    expect(linkedinLink.getAttribute('href')).toBe('https://nl.linkedin.com/in/raymond-de-vries76');
  });

  it('handles newsletter subscription form', () => {
    render(<Footer />);

    const emailInput = screen.getByPlaceholderText('Your email');
    const subscribeButton = screen.getByRole('button', { name: /subscribe/i });

    // Test form interaction
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    expect(emailInput).toHaveValue('test@example.com');

    // Test subscribe button
    expect(subscribeButton).toBeInTheDocument();
  });

  it('renders footer policies links', () => {
    render(<Footer />);

    const policyLinks = [
      { text: 'Privacy Policy', href: '/privacy' },
      { text: 'Terms of Service', href: '/terms' },
      { text: 'Cookie Policy', href: '/cookies' },
    ];

    policyLinks.forEach(({ text, href }) => {
      const link = screen.getByRole('link', { name: text });
      expect(link).toBeInTheDocument();
      expect(link.getAttribute('href')).toBe(href);
    });
  });

  it('renders the current year in copyright notice', () => {
    render(<Footer />);

    const currentYear = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(currentYear))).toBeInTheDocument();
  });
});
