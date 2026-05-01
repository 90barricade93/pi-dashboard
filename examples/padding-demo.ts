/**
 * Demo showing how to use the dynamic padding calculation system
 */

import {
  calculateDynamicPadding,
  calculatePaddingWithLabelProtection,
  calculateAdaptivePadding,
  detectDeviceType,
} from '@/lib/chart-responsive';

// Example 1: Basic dynamic padding
console.log('=== Basic Dynamic Padding ===');
const mobileWidth = 375;
const mobileHeight = 200;
const mobileDevice = detectDeviceType(mobileWidth);
const mobilePadding = calculateDynamicPadding(mobileWidth, mobileHeight, mobileDevice);

console.log(`Mobile (${mobileWidth}x${mobileHeight}):`, mobilePadding);

const desktopWidth = 1200;
const desktopHeight = 600;
const desktopDevice = detectDeviceType(desktopWidth);
const desktopPadding = calculateDynamicPadding(desktopWidth, desktopHeight, desktopDevice);

console.log(`Desktop (${desktopWidth}x${desktopHeight}):`, desktopPadding);

// Example 2: Label-protected padding
console.log('\n=== Label-Protected Padding ===');
const maxPrice = 123.456789;
const minPrice = 0.000001;

const protectedMobilePadding = calculatePaddingWithLabelProtection(
  mobileWidth,
  mobileHeight,
  mobileDevice,
  maxPrice,
  minPrice,
  '$'
);

const protectedDesktopPadding = calculatePaddingWithLabelProtection(
  desktopWidth,
  desktopHeight,
  desktopDevice,
  maxPrice,
  minPrice,
  '$'
);

console.log(`Mobile with price protection:`, protectedMobilePadding);
console.log(`Desktop with price protection:`, protectedDesktopPadding);

// Example 3: Adaptive padding with options
console.log('\n=== Adaptive Padding ===');
const adaptivePadding = calculateAdaptivePadding(mobileWidth, mobileHeight, mobileDevice, {
  maxPrice: 999.123456,
  minPrice: 0.000001,
  currency: '$',
  hasLongPriceLabels: true,
  hasFrequentTimeLabels: true,
  needsTouchTargets: true,
});

console.log(`Mobile with all adaptive features:`, adaptivePadding);

// Example 4: Comparison showing padding differences
console.log('\n=== Padding Comparison ===');
const basicPadding = calculateDynamicPadding(600, 400, 'tablet');
const labelProtectedPadding = calculatePaddingWithLabelProtection(
  600,
  400,
  'tablet',
  50.123456,
  0.001234,
  '€'
);
const fullAdaptivePadding = calculateAdaptivePadding(600, 400, 'tablet', {
  maxPrice: 50.123456,
  minPrice: 0.001234,
  currency: '€',
  hasLongPriceLabels: true,
  hasFrequentTimeLabels: true,
});

console.log('Basic padding:', basicPadding);
console.log('Label-protected padding:', labelProtectedPadding);
console.log('Full adaptive padding:', fullAdaptivePadding);

// Example 5: Edge case handling
console.log('\n=== Edge Case Handling ===');
const smallCanvasPadding = calculateAdaptivePadding(200, 150, 'mobile', {
  maxPrice: 999999.999999,
  minPrice: 0.000000001,
  currency: '$',
  hasLongPriceLabels: true,
  needsTouchTargets: true,
});

console.log(`Small canvas with extreme values:`, smallCanvasPadding);
console.log(
  `Total horizontal padding: ${smallCanvasPadding.left + smallCanvasPadding.right}px (canvas: 200px)`
);
console.log(
  `Total vertical padding: ${smallCanvasPadding.top + smallCanvasPadding.bottom}px (canvas: 150px)`
);
