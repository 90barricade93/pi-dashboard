# Implementation Plan

- [x] 1. Create responsive configuration system and device detection utilities

  - Create types and interfaces for responsive chart configuration
  - Implement device type detection function using existing breakpoints
  - Create configuration objects for different device types and timeframes
  - Write unit tests for device detection and configuration selection
  - _Requirements: 1.1, 3.1, 3.2, 3.3_

- [x] 2. Implement dynamic padding calculation system

  - Create function to calculate responsive padding based on canvas dimensions
  - Implement padding adjustment logic that prevents price label cutoff
  - Add padding configuration for different device types
  - Write tests for padding calculations across various screen sizes
  - _Requirements: 2.1, 2.3, 3.1, 3.2, 3.3_

- [x] 3. Create intelligent time label management engine

  - Implement function to calculate optimal time intervals for each timeframe/device combination
  - Create label priority assignment system (high/medium/low priority)
  - Add collision detection algorithm for time labels
  - Write unit tests for label calculation and collision detection
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4. Implement responsive font sizing system

  - Create function to calculate optimal font sizes based on device type
  - Add font size scaling for different screen sizes
  - Implement minimum and maximum font size constraints
  - Write tests for font size calculations
  - _Requirements: 3.1, 3.2, 3.3, 5.2_

- [x] 5. Refactor canvas rendering to use responsive configuration

  - Update canvas size calculation to use dynamic padding
  - Modify grid line drawing to use responsive spacing
  - Update time label rendering to use intelligent label management
  - Ensure price labels use responsive positioning and font sizes
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

- [x] 6. Add timeframe-specific interval adaptation

  - Implement timeframe-specific time interval calculation
  - Update grid line generation to use adaptive intervals
  - Modify time label generation to respect maximum label limits
  - Add smooth transitions when switching between timeframes
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.2_

- [x] 7. Implement label collision resolution system

  - Create function to resolve overlapping time labels using priority system
  - Add fallback logic for extreme space constraints (show only start/middle/end)
  - Implement intelligent label removal that maintains readability
  - Write comprehensive tests for collision resolution scenarios
  - _Requirements: 1.1, 1.2, 1.4, 4.5_

- [x] 8. Add enhanced price label formatting

  - Implement adaptive decimal place formatting based on available space
  - Create currency-aware label formatting that prevents truncation
  - Add smart truncation for very long price values
  - Write tests for price formatting across different currencies and screen sizes
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 9. Implement debounced resize handling for performance

  - Add resize event listener with debouncing to prevent excessive redraws
  - Implement efficient canvas redraw strategy that only updates when necessary
  - Add performance monitoring for chart rendering times
  - Write performance tests to ensure rendering stays under 500ms
  - _Requirements: 6.1, 6.3, 6.4_

- [x] 10. Add accessibility features and alternative text

  - Implement screen reader support with descriptive chart information
  - Add keyboard navigation for chart interaction
  - Create alternative text descriptions for prediction data
  - Write accessibility tests and ensure high contrast mode compatibility
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 11. Integrate responsive system with existing chart component

  - Update PricePrediction component to use new responsive configuration
  - Replace existing canvas rendering logic with responsive implementation
  - Ensure backward compatibility with existing functionality
  - Add error handling and graceful degradation for edge cases
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 6.1_

- [ ] 12. Implement HiDPI canvas optimization for crisp rendering



  - Create function to setup canvas with device pixel ratio scaling
  - Add fallback handling for HiDPI setup failures
  - Update canvas rendering to work with scaled contexts
  - Write tests for HiDPI rendering on different devices
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 13. Add smooth line rendering configuration
  - Configure canvas context for rounded line caps and joins
  - Update chart line drawing to use smooth rendering settings
  - Ensure smooth rendering works with HiDPI optimization
  - Write visual tests to verify smooth line appearance
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 14. Implement vertical "Now" marker with timestamp label
  - Create function to draw vertical line at current time position
  - Add timestamp label positioning that avoids overlap with other elements
  - Implement responsive styling for the Now marker across device types
  - Write tests for Now marker positioning and visibility
  - _Requirements: 1.1, 3.1, 3.2, 3.3_

- [ ] 15. Add confidence band rendering for prediction uncertainty
  - Create function to draw semi-transparent cone around prediction line
  - Implement confidence band calculation from prediction data
  - Add responsive styling for confidence bands across device types
  - Write tests for confidence band rendering with various data sets
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 16. Implement hover tooltip system with nearest point detection
  - Create tooltip component that shows timestamp, price, current and target values
  - Implement algorithm to find nearest data point to mouse position
  - Add tooltip positioning logic that handles viewport edge cases
  - Write tests for tooltip accuracy and positioning
  - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2_

- [ ] 17. Optimize axis range padding for better data visualization
  - Implement dynamic axis range calculation with 0.5-1.0% padding
  - Update Y-axis scaling to minimize empty space around data
  - Add logic to handle edge cases with very small or large price ranges
  - Write tests for axis range optimization across different data sets
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 18. Create comprehensive test suite for responsive chart behavior
  - Write integration tests for complete chart rendering across device types
  - Add visual regression tests for different timeframe/device combinations
  - Create performance benchmarks for chart rendering and updates
  - Write end-to-end tests for user interactions across different screen sizes
  - Test new features: Now marker, confidence bands, tooltips, HiDPI rendering
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_