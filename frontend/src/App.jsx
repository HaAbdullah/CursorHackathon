import { useEffect, useRef, useState } from "react";
import BottomNav from "./components/BottomNav.jsx";
import ProfileScreen from "./components/ProfileScreen.jsx";
import ReportScreen from "./components/ReportScreen.jsx";
import ScanScreen from "./components/ScanScreen.jsx";
import UploadScreen from "./components/UploadScreen.jsx";
import { getScan, postScan } from "./api.js";

const DEFAULT_PROFILE = { trimester: 2, conditions: [], allergies: [] };
const PROFILE_KEY = "safescan-profile";
const RECENTS_KEY = "safescan-recent-checks";

function readStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function failureMessage(error) {
  if (error instanceof TypeError || /failed to fetch|networkerror/i.test(error?.message || "")) {
    return "Couldn't reach SafeScan. Check that the backend is running, then try again.";
  }
  if (error?.message) return error.message;
  return "Couldn't complete this check. Try again with a clear label photo or barcode.";
}

export default function App() {
  const [activeTab, setActiveTab] = useState("scan");
  const [profile, setProfile] = useState(() => ({
    ...DEFAULT_PROFILE,
    ...readStorage(PROFILE_KEY, DEFAULT_PROFILE),
  }));
  const [recentChecks, setRecentChecks] = useState(() =>
    readStorage(RECENTS_KEY, []).slice(0, 5),
  );
  const [scan, setScan] = useState(null);
  const [retryTab, setRetryTab] = useState("scan");
  const requestNumber = useRef(0);

  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    if (!scan?.scan_id || scan.status === "submitting") return;

    setRecentChecks((current) => {
      const previous = current.find((item) => item.scan_id === scan.scan_id);
      const refreshed = {
        scan_id: scan.scan_id,
        product_name:
          scan.report?.product_name || previous?.product_name || "Product check",
        verdict: scan.report?.verdict || previous?.verdict || "pending",
        at: new Date().toISOString(),
      };
      const next = [refreshed, ...current.filter((item) => item.scan_id !== scan.scan_id)].slice(0, 5);
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      return next;
    });
  }, [scan?.scan_id, scan?.status]);

  useEffect(() => {
    if (!scan?.scan_id || !["processing", "partial"].includes(scan.status)) return undefined;

    let cancelled = false;
    const poll = async () => {
      try {
        const next = await getScan(scan.scan_id);
        if (!cancelled) setScan(next);
      } catch (error) {
        if (!cancelled) {
          setScan((current) => ({
            ...current,
            status: "failed",
            error: failureMessage(error),
          }));
        }
      }
    };

    const interval = window.setInterval(poll, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [scan?.scan_id, scan?.status]);

  async function submitScan({ barcode = "", photos = [], origin }) {
    const currentRequest = requestNumber.current + 1;
    requestNumber.current = currentRequest;
    setRetryTab(origin);
    setScan({ status: "submitting", scan_id: null, report: null, error: null });
    setActiveTab("report");

    const formData = new FormData();
    photos.forEach((photo) => formData.append("photos", photo));
    if (barcode) formData.append("barcode", barcode);
    formData.append("profile", JSON.stringify(profile));

    try {
      const result = await postScan(formData);
      if (requestNumber.current === currentRequest) setScan(result);
    } catch (error) {
      if (requestNumber.current === currentRequest) {
        setScan({
          status: "failed",
          scan_id: null,
          report: null,
          error: failureMessage(error),
        });
      }
    }
  }

  async function openRecent(scanId) {
    const currentRequest = requestNumber.current + 1;
    requestNumber.current = currentRequest;
    setRetryTab("scan");
    setScan({ status: "submitting", scan_id: scanId, report: null, error: null });
    setActiveTab("report");

    try {
      const result = await getScan(scanId);
      if (requestNumber.current === currentRequest) setScan(result);
    } catch (error) {
      if (requestNumber.current === currentRequest) {
        setScan({
          status: "failed",
          scan_id: scanId,
          report: null,
          error: failureMessage(error),
        });
      }
    }
  }

  function changeTab(tab) {
    requestNumber.current += 1;
    setActiveTab(tab);
  }

  return (
    <div className="app-frame">
      <main className="app-content">
        {activeTab === "scan" && (
          <ScanScreen
            profile={profile}
            recentChecks={recentChecks}
            onSubmit={(barcode) => submitScan({ barcode, origin: "scan" })}
            onOpenRecent={openRecent}
            onUpload={() => changeTab("upload")}
          />
        )}
        {activeTab === "upload" && (
          <UploadScreen onSubmit={(photos) => submitScan({ photos, origin: "upload" })} />
        )}
        {activeTab === "report" && (
          <ReportScreen scan={scan} onTryAgain={() => changeTab(retryTab)} />
        )}
        {activeTab === "profile" && (
          <ProfileScreen profile={profile} onChange={setProfile} />
        )}
      </main>
      <BottomNav activeTab={activeTab} onChange={changeTab} />
    </div>
  );
}
