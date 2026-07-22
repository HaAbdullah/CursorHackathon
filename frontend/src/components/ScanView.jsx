import { useEffect, useId, useRef, useState } from "react";
import { DEMO_PRODUCTS } from "../lib/mockScan.js";
import StagePicker from "./StagePicker.jsx";

export default function ScanView({ stage, onStageChange, onScan, busy }) {
  const [barcode, setBarcode] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanLoopRef = useRef(0);
  const inputId = useId();

  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function startCamera() {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera isn’t available in this browser. Enter a barcode or use a demo product.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      runBarcodeLoop();
    } catch {
      setCameraError("Camera permission denied. Enter a barcode or tap a demo product.");
      setCameraOn(false);
    }
  }

  function stopCamera() {
    cancelAnimationFrame(scanLoopRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }

  function runBarcodeLoop() {
    const Detector = window.BarcodeDetector;
    if (!Detector || !videoRef.current) return;

    let detector;
    try {
      detector = new Detector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
      });
    } catch {
      return;
    }

    const tick = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        scanLoopRef.current = requestAnimationFrame(tick);
        return;
      }
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes[0]?.rawValue) {
          const value = codes[0].rawValue;
          setBarcode(value);
          stopCamera();
          onScan(value);
          return;
        }
      } catch {
        // keep trying
      }
      scanLoopRef.current = requestAnimationFrame(tick);
    };

    scanLoopRef.current = requestAnimationFrame(tick);
  }

  function submitManual(e) {
    e.preventDefault();
    if (!barcode.trim() || busy) return;
    onScan(barcode.trim());
  }

  return (
    <section className="panel scan-panel">
      <header className="brand-block">
        <p className="brand-mark">Expecta</p>
        <h1 className="brand-line">Is this safe for you right now?</h1>
        <p className="brand-sub">
          Scan at the shelf. Get a pregnancy or nursing verdict with the reasoning behind it — not a forum thread.
        </p>
      </header>

      <StagePicker value={stage} onChange={onStageChange} />

      <div className={`viewfinder${cameraOn ? " is-live" : ""}`}>
        {cameraOn ? (
          <video ref={videoRef} className="viewfinder__video" playsInline muted />
        ) : (
          <div className="viewfinder__idle">
            <span className="viewfinder__frame" aria-hidden="true" />
            <p>Point at a barcode, or enter one below</p>
          </div>
        )}
        <div className="viewfinder__actions">
          {cameraOn ? (
            <button type="button" className="btn btn-ghost" onClick={stopCamera} disabled={busy}>
              Stop camera
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={startCamera} disabled={busy}>
              Open camera
            </button>
          )}
        </div>
      </div>

      {cameraError ? <p className="form-hint form-hint--warn">{cameraError}</p> : null}

      <form className="barcode-form" onSubmit={submitManual}>
        <label htmlFor={inputId}>Barcode</label>
        <div className="barcode-form__row">
          <input
            id={inputId}
            inputMode="numeric"
            autoComplete="off"
            placeholder="e.g. 3017624010701"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            disabled={busy}
          />
          <button type="submit" className="btn btn-primary" disabled={busy || !barcode.trim()}>
            {busy ? "Checking…" : "Check"}
          </button>
        </div>
      </form>

      <div className="demo-shelf">
        <p className="demo-shelf__label">Demo shelf — tap to scan</p>
        <ul className="demo-shelf__list">
          {DEMO_PRODUCTS.map((product) => (
            <li key={product.barcode}>
              <button
                type="button"
                className="demo-item"
                disabled={busy}
                onClick={() => {
                  setBarcode(product.barcode);
                  onScan(product.barcode);
                }}
              >
                <span className="demo-item__cat">{product.category}</span>
                <span className="demo-item__name">{product.name}</span>
                <span className="demo-item__brand">{product.brand}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
