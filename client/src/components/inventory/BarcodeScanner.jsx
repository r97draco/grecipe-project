import { useEffect, useRef, useState } from 'react';
import { FiCamera, FiRefreshCw, FiX } from 'react-icons/fi';
import { requestCamera, cameraErrorMessage } from '../../utils/camera';

export default function BarcodeScanner({ cameraRequest, onDetected, onCancel }) {
  const video = useRef(null);
  const pendingRequest = useRef(cameraRequest);
  const callbacks = useRef({ onDetected, onCancel });
  callbacks.current = { onDetected, onCancel };
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const pending = pendingRequest.current;
    let cancelled = false;
    let finished = false;
    let stream;
    let controls;
    const stop = () => {
      controls?.stop();
      stream?.getTracks().forEach(track => track.stop());
    };
    setError('');
    setReady(false);
    const start = async () => {
      try {
        const camera = await pending.promise;
        if (camera.error) throw camera.error;
        stream = camera.stream;
        if (cancelled) { stop(); return; }
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import('@zxing/browser'), import('@zxing/library'),
        ]);
        if (cancelled) return;
        if (cancelled) { stop(); return; }
        const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
        ]]]);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 200 });
        controls = await reader.decodeFromStream(stream, video.current, (result, scanError, scanner) => {
          if (cancelled || finished || !result) return;
          const value = result.getText();
          if (!/^\d{8,14}$/.test(value)) return;
          finished = true;
          scanner.stop();
          stop();
          callbacks.current.onDetected(value);
        });
        if (cancelled || finished) stop();
        else setReady(true);
      } catch (failure) {
        stop();
        if (cancelled) return;
        setError(cameraErrorMessage(failure));
      }
    };
    const hide = () => {
      if (document.hidden) {
        cancelled = true;
        stop();
        callbacks.current.onCancel();
      }
    };
    document.addEventListener('visibilitychange', hide);
    start();
    return () => { cancelled = true; pending.controller.abort(); stop(); document.removeEventListener('visibilitychange', hide); };
  }, [attempt]);

  return <section className="barcode-scanner" aria-label="Scan product barcode">
    <div className="barcode-scanner-heading"><strong><FiCamera/>Scan barcode</strong><button type="button" onClick={onCancel} aria-label="Close camera"><FiX/></button></div>
    {error && <div className="barcode-camera-error" role="alert"><p>{error}</p><button type="button" onClick={() => {
      const controller=new AbortController();
      const promise=requestCamera({facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},controller.signal).then(stream=>({stream}),error=>({error}));
      pendingRequest.current={controller,promise};setAttempt(value=>value+1);
    }}><FiRefreshCw/>Try again</button></div>}
    <div className="barcode-viewfinder" hidden={!!error}><video ref={video} autoPlay muted playsInline aria-label="Live barcode camera preview"/><div className="barcode-scan-guide" aria-hidden="true"/>{!ready && <span role="status">Opening camera…</span>}</div>
    {!error && <p role="status">Point the camera at the barcode on the package.</p>}
    <button type="button" className="barcode-manual" onClick={onCancel}>Enter barcode instead</button>
  </section>;
}
