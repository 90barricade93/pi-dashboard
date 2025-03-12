import React from 'react';
import { render, screen, fireEvent, cleanup } from './test-utils';
import Header from '../components/header';

describe('Header', () => {
  // Cleanup after each test
  afterEach(() => {
    cleanup();
  });

  it('renders the header with logo and brand name', () => {
    render(<Header />);

    expect(screen.getByText('90barricade93 Pi Dashboard')).toBeInTheDocument();
    expect(screen.getByText('π')).toBeInTheDocument();
  });

  it('renders and interacts with the notifications button', () => {
    render(<Header />);

    const notificationsButton = screen.getByRole('button', { name: /notifications/i });
    expect(notificationsButton).toBeInTheDocument();

    // Test clicking the notifications button
    fireEvent.click(notificationsButton);

    // Check if notifications menu appears
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Pi Network Update')).toBeInTheDocument();
    expect(screen.getByText('Price Alert')).toBeInTheDocument();
  });

  it('renders and interacts with the theme toggle', () => {
    render(<Header />);

    const themeButton = screen.getByRole('button', { name: /toggle theme/i });
    expect(themeButton).toBeInTheDocument();

    // Test clicking the theme button
    fireEvent.click(themeButton);

    // Check if theme menu appears
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('navigates to home when clicking the logo', () => {
    render(<Header />);

    const homeLink = screen.getByRole('link', { name: /90barricade93 pi dashboard/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink.getAttribute('href')).toBe('/');
  });
});
