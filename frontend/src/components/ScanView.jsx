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
  const onScanRef = useRef(onScan);
  const inputId = useId();

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  // Attach the stream only after the <video> is mounted.
  useEffect(() => {
    if (!cameraOn) return undefined;

    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return undefined;

    video.srcObject = stream;
    let cancelled = false;

    async function play() {
      try {
        await video.play();
        if (!cancelled) startBarcodeLoop();
      } catch {
        if (!cancelled) {
          setCameraError("Couldn’t start the camera preview. Try again or use a demo product.");
        }
      }
    }

    play();

    return () => {
      cancelled = true;
      cancelAnimationFrame(scanLoopRef.current);
      if (video.srcObject === stream) {
        video.srcObject = null;
      }
    };
  }, [cameraOn]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(scanLoopRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  async function requestStream() {
    const attempts = [
      { video: { facingMode: { ideal: "environment" } }, audio: false },
      { video: { facingMode: "user" }, audio: false },
      { video: true, audio: false },
    ];

    let lastError;
    for (const constraints of attempts) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }

  async function startCamera() {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera isn’t available in this browser. Enter a barcode or use a demo product.");
      return;
    }

    try {
      // Tear down any prior stream before opening a new one.
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const stream = await requestStream();
      streamRef.current = stream;
      setCameraOn(true);
    } catch {
      setCameraError("Camera permission denied or unavailable. Enter a barcode or tap a demo product.");
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

  function startBarcodeLoop() {
    const Detector = window.BarcodeDetector;
    const video = videoRef.current;
    if (!Detector || !video) return;

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
          onScanRef.current(value);
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
        <video
          ref={videoRef}
          className={`viewfinder__video${cameraOn ? " is-visible" : ""}`}
          playsInline
          muted
          autoPlay
        />
        {!cameraOn ? (
          <div className="viewfinder__idle">
            <span className="viewfinder__frame" aria-hidden="true" />
            <p>Point at a barcode, or enter one below</p>
          </div>
        ) : null}
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
