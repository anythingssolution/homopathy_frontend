import React, { Component, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import LiveQueueFlow from '../components/LiveQueueFlow';
import { playCallChime } from '../utils/callTune';

declare global {
  interface Window {
    tvQueueMounted?: boolean;
    showTvLoadError?: () => void;
  }
}

class TvErrorBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { window.showTvLoadError?.(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function TvQueue() {
  const [soundReady, setSoundReady] = useState(false);
  const audioAvailable = Boolean(window.AudioContext || (window as any).webkitAudioContext);
  useEffect(() => {
    window.tvQueueMounted = true;
    const loadError = document.getElementById('tv-load-error');
    if (loadError) loadError.hidden = true;
  }, []);
  return <>
    <LiveQueueFlow />
    <button type="button" className="tv-sound-control" disabled={!audioAvailable}
      title="Use the TV remote to enable browser audio. This does not call a patient."
      onClick={() => { playCallChime(); setSoundReady(true); }}>
      {!audioAvailable ? 'Audio unavailable in this browser' : soundReady ? 'Test sound' : 'Enable sound'}
    </button>
  </>;
}

createRoot(document.getElementById('root')!).render(
  <TvErrorBoundary><BrowserRouter><TvQueue /></BrowserRouter></TvErrorBoundary>,
);
