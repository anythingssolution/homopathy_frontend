import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ChevronLeft, ChevronRight, FileWarning, RefreshCw, ShieldAlert, TerminalSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type LogFile = {
  file_name: string;
  file_path: string;
  date_key: string | null;
  modified_at: string;
  size_bytes: number;
};

type LogPreview = {
  file_name: string;
  content: string;
  preview_truncated: boolean;
  preview_content: string;
};

type OverviewResponse = {
  success: boolean;
  message?: string;
  data: {
    logs_directory: string;
    days_covered: number;
    files: LogFile[];
    latest_file: LogFile | null;
    latest_preview: LogPreview | null;
  };
};

type FileResponse = {
  success: boolean;
  message?: string;
  data: LogFile & LogPreview;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getEntryAccent = (entry: string, index: number) => {
  const statusMatch = entry.match(/"statusCode":(\d+)/);
  const statusCode = statusMatch ? Number(statusMatch[1]) : null;

  if (statusCode && statusCode >= 500) {
    return {
      border: 'border-[#ff5f56]/55',
      glow: 'shadow-[inset_4px_0_0_0_rgba(255,95,86,0.9)]',
      badge: 'bg-[#2a0d10] text-[#ff8f8f] border-[#6b2329]',
    };
  }

  if (statusCode && statusCode >= 400) {
    return {
      border: 'border-[#ffd166]/45',
      glow: 'shadow-[inset_4px_0_0_0_rgba(255,209,102,0.85)]',
      badge: 'bg-[#261f0b] text-[#ffd97b] border-[#6f5a1a]',
    };
  }

  return {
    border: index % 2 === 0 ? 'border-[#1d5330]/50' : 'border-[#234a5c]/45',
    glow: index % 2 === 0
      ? 'shadow-[inset_4px_0_0_0_rgba(95,255,146,0.75)]'
      : 'shadow-[inset_4px_0_0_0_rgba(83,205,255,0.75)]',
    badge: index % 2 === 0
      ? 'bg-[#0d1f13] text-[#7dff9e] border-[#255832]'
      : 'bg-[#0b1820] text-[#7dd3ff] border-[#234f67]',
  };
};

export default function BackendLogsModule() {
  const { user, token } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [files, setFiles] = useState<LogFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<LogPreview | null>(null);
  const [logsDirectory, setLogsDirectory] = useState('');
  const [daysCovered, setDaysCovered] = useState(10);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAccessGranted, setIsAccessGranted] = useState(() => Boolean(token));

  const viewerName = user?.name || 'Operator';

  const fetchFile = useCallback(async (fileName: string) => {
    if (!isAccessGranted) return;
    setIsLoadingFile(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/ops/system-logs/file/${encodeURIComponent(fileName)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result: FileResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to open log file');
      }

      setSelectedFile(result.data.file_name);
      setSelectedContent({
        file_name: result.data.file_name,
        content: result.data.content,
        preview_truncated: result.data.preview_truncated,
        preview_content: result.data.preview_content,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open log file');
    } finally {
      setIsLoadingFile(false);
    }
  }, [isAccessGranted, token]);

  const fetchOverview = useCallback(async () => {
    if (!isAccessGranted) {
      setIsLoadingOverview(false);
      return;
    }

    setIsLoadingOverview(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/ops/system-logs/overview', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result: OverviewResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to load logs overview');
      }

      setFiles(result.data.files);
      setLogsDirectory(result.data.logs_directory);
      setDaysCovered(result.data.days_covered);

      if (result.data.latest_preview) {
        setSelectedFile(result.data.latest_preview.file_name);
        setSelectedContent(result.data.latest_preview);
      } else {
        setSelectedFile(null);
        setSelectedContent(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load logs overview');
    } finally {
      setIsLoadingOverview(false);
    }
  }, [isAccessGranted, token]);

  useEffect(() => {
    setIsAccessGranted(Boolean(token));
  }, [token]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleLockLogs = () => {
    window.location.assign('/doctor-portal');
  };

  const previewText = useMemo(() => {
    if (!selectedContent) return '';
    return selectedContent.preview_truncated ? selectedContent.preview_content : selectedContent.content;
  }, [selectedContent]);

  const parsedEntries = useMemo(() => {
    if (!previewText.trim()) return [];

    return previewText
      .split('\n')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry, index) => ({
        raw: entry,
        accent: getEntryAccent(entry, index),
      }));
  }, [previewText]);

  if (!isAccessGranted) {
    return (
      <div className="min-h-screen bg-[#05080a] text-[#8fffa6] relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{
          backgroundImage: 'linear-gradient(rgba(80,255,120,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(80,255,120,0.10) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }} />
        <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-xl rounded-[32px] border border-[#1d3b25] bg-black/75 p-8 shadow-[0_0_50px_rgba(0,255,128,0.08)] backdrop-blur-xl">
            <div className="mb-6 flex items-center gap-3 text-[#5dff89]">
              <TerminalSquare className="h-8 w-8" />
              <div>
                <div className="text-xs font-black uppercase tracking-[0.45em] text-[#58ff8f]/80">Secure Logs Entry</div>
                <h1 className="mt-2 text-3xl font-black uppercase tracking-[0.18em] text-[#d9ffe3]">{viewerName}</h1>
              </div>
            </div>

            <p className="mb-6 text-sm text-[#8db49a]">
              Welcome {viewerName}. Sign in as the authorized production operator to view backend logs.
            </p>

            <a
              href="/booking"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#2b5d37] bg-[#08110c] px-4 py-3 text-sm font-bold uppercase tracking-[0.25em] text-[#8fffa6] transition hover:border-[#60ff93] hover:bg-[#0d1b12]"
            >
              Go to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05080a] text-[#8fffa6] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-20" style={{
        backgroundImage: 'linear-gradient(rgba(80,255,120,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(80,255,120,0.10) 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,255,102,0.12),transparent_35%),radial-gradient(circle_at_bottom,rgba(0,180,255,0.08),transparent_25%)]" />

      <div className="relative z-10 px-4 py-6 md:px-8 md:py-8">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-[#1d3b25] bg-black/70 p-5 shadow-[0_0_40px_rgba(0,255,128,0.08)] backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3 text-[#5dff89]">
              <TerminalSquare className="h-7 w-7" />
              <span className="text-xs font-black uppercase tracking-[0.45em] text-[#58ff8f]/80">Backend Surveillance Console</span>
            </div>
            <h1 className="text-3xl font-black uppercase tracking-[0.18em] text-[#d9ffe3] md:text-4xl">System Logs</h1>
            <p className="mt-2 text-sm text-[#8db49a]">
              Last {daysCovered} days • direct backend file monitor • latest log auto-opened
            </p>
          </div>

          <button
            onClick={fetchOverview}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#2b5d37] bg-[#08110c] px-4 py-3 text-sm font-bold uppercase tracking-[0.25em] text-[#8fffa6] transition hover:border-[#60ff93] hover:bg-[#0d1b12]"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingOverview ? 'animate-spin' : ''}`} />
            Refresh Feed
          </button>
          <button
            onClick={handleLockLogs}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#5d2b2b] bg-[#14090a] px-4 py-3 text-sm font-bold uppercase tracking-[0.25em] text-[#ff9b9b] transition hover:border-[#ff8c8c] hover:bg-[#1c0c0d]"
          >
            Back to Portal
          </button>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#633] bg-[#17090b]/90 p-4 text-[#ff8f8f]">
            <ShieldAlert className="mt-0.5 h-5 w-5 flex-none" />
            <div>
              <div className="text-sm font-black uppercase tracking-[0.2em]">Alert</div>
              <div className="mt-1 text-sm">{error}</div>
            </div>
          </div>
        )}

        <div className={`grid gap-6 ${isSidebarCollapsed ? 'lg:grid-cols-[88px_minmax(0,1fr)]' : 'lg:grid-cols-[340px_minmax(0,1fr)]'}`}>
          <section className={`rounded-3xl border border-[#1b3321] bg-black/70 p-4 shadow-[0_0_32px_rgba(0,255,128,0.06)] transition-all duration-300 ${isSidebarCollapsed ? 'overflow-hidden' : ''}`}>
            <div className={`mb-4 flex ${isSidebarCollapsed ? 'flex-col items-center gap-3' : 'items-center justify-between gap-3'}`}>
              <div className={`flex items-center gap-2 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                <Activity className="h-5 w-5 text-[#63ff97]" />
                {!isSidebarCollapsed && (
                  <h2 className="text-sm font-black uppercase tracking-[0.35em] text-[#d7ffe1]">Log Files</h2>
                )}
              </div>
              <button
                onClick={() => setIsSidebarCollapsed((value) => !value)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#24452d] bg-[#08110c] text-[#8fffa6] transition hover:border-[#60ff93] hover:bg-[#0d1b12]"
                aria-label={isSidebarCollapsed ? 'Expand log sidebar' : 'Collapse log sidebar'}
                title={isSidebarCollapsed ? 'Expand log sidebar' : 'Collapse log sidebar'}
              >
                {isSidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
              </button>
            </div>

            {!isSidebarCollapsed ? (
              <>
                <div className="space-y-3">
                  {files.map((file, index) => {
                    const isActive = selectedFile === file.file_name;
                    return (
                      <button
                        key={file.file_name}
                        onClick={() => fetchFile(file.file_name)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          isActive
                            ? 'border-[#60ff93] bg-[#0b1a11] shadow-[0_0_25px_rgba(96,255,147,0.12)]'
                            : 'border-[#16301d] bg-[#060a08] hover:border-[#2f6a3f] hover:bg-[#09110c]'
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#5fff92]">
                            {index === 0 ? 'Latest' : `D-${index}`}
                          </span>
                          <span className="text-[11px] text-[#769782]">{formatBytes(file.size_bytes)}</span>
                        </div>
                        <div className="font-mono text-sm break-all text-[#e1ffe8]">{file.file_name}</div>
                        <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[#6f927a]">
                          {file.date_key || 'unknown date'} • {new Date(file.modified_at).toLocaleString()}
                        </div>
                      </button>
                    );
                  })}

                  {!isLoadingOverview && files.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-[#28402d] bg-[#060b08] p-5 text-center text-sm text-[#7f9d89]">
                      No log files found for the last {daysCovered} days.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 pt-2">
                {files.slice(0, 8).map((file, index) => {
                  const isActive = selectedFile === file.file_name;
                  return (
                    <button
                      key={file.file_name}
                      onClick={() => fetchFile(file.file_name)}
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-[11px] font-black uppercase tracking-[0.18em] transition ${
                        isActive
                          ? 'border-[#60ff93] bg-[#0b1a11] text-[#bfffd0] shadow-[0_0_20px_rgba(96,255,147,0.12)]'
                          : 'border-[#16301d] bg-[#060a08] text-[#7fe7a0] hover:border-[#2f6a3f] hover:bg-[#09110c]'
                      }`}
                      title={file.file_name}
                    >
                      {index === 0 ? 'L' : index}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="min-w-0 rounded-3xl border border-[#1b3321] bg-black/70 p-4 shadow-[0_0_32px_rgba(0,255,128,0.06)]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black uppercase tracking-[0.35em] text-[#d7ffe1]">Live Viewer</div>
                <div className="mt-2 font-mono text-sm text-[#7dff9e]">
                  {selectedFile || 'No file selected'}
                </div>
              </div>
              {selectedContent?.preview_truncated && (
                <div className="rounded-full border border-[#614f18] bg-[#221b08] px-3 py-1 text-[11px] font-black uppercase tracking-[0.25em] text-[#ffd56b]">
                  Showing tail preview
                </div>
              )}
            </div>

            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-[#6f927a]">
              <FileWarning className="h-4 w-4" />
              Latest file auto-opens on load
            </div>

            <div className="min-w-0 rounded-[28px] border border-[#14311d] bg-[#020403] p-3">
              <div className="max-h-[68vh] min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain rounded-[22px] bg-[#010201] p-4 shadow-[inset_0_0_30px_rgba(0,255,128,0.06)] [scrollbar-gutter:stable]">
                {isLoadingFile || isLoadingOverview ? (
                  <pre className="max-w-full whitespace-pre-wrap break-words break-all font-mono text-[12px] leading-6 text-[#7dff9e]">
                    {'booting log console...\nloading latest telemetry...'}
                  </pre>
                ) : parsedEntries.length > 0 ? (
                  <div className="min-w-0 space-y-3">
                    {parsedEntries.map((entry, index) => (
                      <div
                        key={`${selectedFile || 'log'}-${index}`}
                        className={`min-w-0 rounded-2xl border bg-[#050706] px-4 py-3 ${entry.accent.border} ${entry.accent.glow}`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.28em] ${entry.accent.badge}`}>
                            Log Start {String(index + 1).padStart(2, '0')}
                          </span>
                        </div>
                        <pre className="max-w-full whitespace-pre-wrap break-words break-all font-mono text-[12px] leading-6 text-[#b9ffca]">
                          {entry.raw}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <pre className="max-w-full whitespace-pre-wrap break-words break-all font-mono text-[12px] leading-6 text-[#7dff9e]">
                    No log content available.
                  </pre>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
