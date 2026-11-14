export function cameraErrorMessage(error) {
  const messages = {
    NotAllowedError: 'Camera access is blocked. Allow camera access in your browser’s site settings, then try again.',
    NotFoundError: 'No camera found. Try a phone or computer with a camera.',
    NotReadableError: 'The camera is busy. Close other apps using it and try again.',
    TimeoutError: 'No camera permission response. Open this page in Chrome or Safari, allow camera access, and try again.',
    SecurityError: 'This browser can’t access the camera. Open this page in Chrome or Safari.',
    AbortError: 'Camera request cancelled.',
  };
  return messages[error?.name] || error?.message || 'Couldn’t open the camera. Please try again.';
}

// Invoke from the user’s click, before downloading a vision model. Browsers can
// leave permission requests unresolved; release any stream granted after exit.
export function requestCamera(video, signal) {
  return new Promise((resolve, reject) => {
    let finished = false;
    let timer;
    const fail = error => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      reject(error);
    };
    const abort = () => fail(new DOMException('Camera request cancelled.', 'AbortError'));
    if (signal?.aborted) { abort(); return; }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      fail(new Error('Camera access needs HTTPS or localhost. Open the secure website in Chrome or Safari.'));
      return;
    }
    signal?.addEventListener('abort', abort, { once: true });
    timer = setTimeout(() => fail(new DOMException('No camera response.', 'TimeoutError')), 15000);
    navigator.mediaDevices.getUserMedia({ audio: false, video }).then(stream => {
      if (finished || signal?.aborted) { stream.getTracks().forEach(track => track.stop()); return; }
      finished = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      resolve(stream);
    }, fail);
  });
}
