interface DocumentWithViewTransitions extends Document {
  startViewTransition?: (callback: () => void) => unknown;
}

export function withViewTransition(callback: () => void) {
  if (typeof document === 'undefined') {
    callback();
    return;
  }
  const doc = document as DocumentWithViewTransitions;
  if (typeof doc.startViewTransition === 'function') {
    doc.startViewTransition(callback);
  } else {
    callback();
  }
}
