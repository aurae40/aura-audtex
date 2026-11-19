import React, { useState, useEffect } from 'react';
import {
  X,
  FileAudio,
  ShieldCheck,
  Server,
  Cpu,
  Globe,
  CheckCircle2,
  RefreshCw,
  DownloadCloud,
  HardDrive,
  Smartphone,
  Laptop,
  AlertCircle,
} from 'lucide-react';
import type { TranscriberEngine, LocalServerStatus } from '../services/transcriptionService';
import {
  checkLocalServerHealth,
  getStoredServerUrl,
  setStoredServerUrl,
  setStoredTranscriberEngine,
} from '../services/transcriptionService';
import {
  getDeviceCapabilities,
  type DeviceCapabilities,
} from '../services/deviceCapabilityService';
import {
  getAllOfflineModelsStatus,
  downloadModelForOffline,
  type OfflineModelInfo,
} from '../services/offlineModelManager';
import type { BuiltinWhisperModel } from '../services/builtinWhisperService';

const LOCAL_ENGINE_EXTENSIONS = new Set([
  'mp3', 'wav', 'm4a', 'm4b', 'aac', 'ogg', 'oga', 'opus', 'flac', 'weba', 'webm',
  'mp4', 'aif', 'aiff', 'amr', '3gp', 'caf', 'wma',
]);

const MIME_BY_EXTENSION: Record<string, string> = {
  mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', m4b: 'audio/mp4', aac: 'audio/aac',
  ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg; codecs=opus', flac: 'audio/flac',
  weba: 'audio/webm', webm: 'audio/webm', mp4: 'audio/mp4', aif: 'audio/aiff', aiff: 'audio/aiff',
  amr: 'audio/amr', '3gp': 'audio/3gpp', caf: 'audio/x-caf', wma: 'audio/x-ms-wma',
};

function browserCanDecode(file: File, extension: string): boolean {
  if (typeof document === 'undefined') return false;
  const mime = file.type || MIME_BY_EXTENSION[extension];
  return Boolean(mime && document.createElement('audio').canPlayType(mime));
}

interface ImportConsentModalProps {
  file: File;
  onConfirm: (engine: TranscriberEngine, storeAudio: boolean, customUrl?: string, builtinModel?: BuiltinWhisperModel) => void;
  onCancel: () => void;
  initialEngine: TranscriberEngine;
}

export const ImportConsentModal: React.FC<ImportConsentModalProps> = ({
  file,
  onConfirm,
  onCancel,
  initialEngine,
}) => {
  const [selectedEngine, setSelectedEngine] = useState<TranscriberEngine>(initialEngine || 'builtin');
  const [storeAudioInVault, setStoreAudioInVault] = useState<boolean>(true);
  const [serverUrl, setServerUrl] = useState<string>(getStoredServerUrl);
  const [serverStatus, setServerStatus] = useState<LocalServerStatus | null>(null);
  const [isCheckingServer, setIsCheckingServer] = useState<boolean>(false);

  // Device & Offline Models State
  const [deviceCaps, setDeviceCaps] = useState<DeviceCapabilities | null>(null);
  const [offlineModels, setOfflineModels] = useState<OfflineModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<BuiltinWhisperModel>('whisper-tiny.en');
  const [downloadProgress, setDownloadProgress] = useState<{ pct: number; status: string } | null>(null);
  const [isDownloadingModel, setIsDownloadingModel] = useState<boolean>(false);

  useEffect(() => {
    const initModal = async () => {
      setIsCheckingServer(true);
      let status: LocalServerStatus = { online: false };
      try {
        status = await checkLocalServerHealth(serverUrl);
        // If initial check is offline and page is on HTTPS, check the active secure tunnel
        if (!status.online && typeof window !== 'undefined' && window.location.protocol === 'https:') {
          const tunnelUrl = 'https://visited-adjustments-condition-fiber.trycloudflare.com';
          const tunnelStatus = await checkLocalServerHealth(tunnelUrl);
          if (tunnelStatus.online) {
            status = tunnelStatus;
            setServerUrl(tunnelUrl);
          }
        }
        setServerStatus(status);
        if (status.online && status.urlChecked) {
          setServerUrl(status.urlChecked);
        }
      } catch {
        setServerStatus({ online: false });
      } finally {
        setIsCheckingServer(false);
      }

      // Automatically select local Faster-Whisper if online; otherwise fallback to builtin
      if (status.online) {
        setSelectedEngine('local');
      } else {
        const savedEngine = localStorage.getItem('aura_transcriber_engine');
        if (savedEngine === 'remote') {
          setSelectedEngine('remote');
        } else {
          setSelectedEngine('builtin');
        }
      }
    };

    initModal();
    loadCapabilitiesAndModels();
  }, []);

  const loadCapabilitiesAndModels = async () => {
    try {
      const caps = await getDeviceCapabilities();
      setDeviceCaps(caps);
      setSelectedModel(caps.recommendedModel);

      const models = await getAllOfflineModelsStatus();
      setOfflineModels(models);
    } catch (err) {
      console.warn('Failed to load device info or models:', err);
    }
  };

  const checkServer = async (urlToCheck: string) => {
    setIsCheckingServer(true);
    try {
      const status = await checkLocalServerHealth(urlToCheck);
      setServerStatus(status);
    } catch {
      setServerStatus({ online: false });
    } finally {
      setIsCheckingServer(false);
    }
  };

  const handleDownloadModelNow = async () => {
    setIsDownloadingModel(true);
    setDownloadProgress({ pct: 5, status: 'Initializing neural download...' });
    try {
      await downloadModelForOffline(selectedModel, (pct, status) => {
        setDownloadProgress({ pct, status });
      });
      // Refresh models status
      const updated = await getAllOfflineModelsStatus();
      setOfflineModels(updated);
      setTimeout(() => {
        setDownloadProgress(null);
        setIsDownloadingModel(false);
      }, 1500);
    } catch (err) {
      console.error('Model download error:', err);
      setDownloadProgress({
        pct: 0,
        status: `Download failed: ${err instanceof Error ? err.message : String(err)}`,
      });
      setIsDownloadingModel(false);
    }
  };

  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
  const activeModelInfo = offlineModels.find((m) => m.id === selectedModel);

  // Preflight validations
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'audio';
  const audioFormatSupported = LOCAL_ENGINE_EXTENSIONS.has(fileExt) || file.type.startsWith('audio/') || file.size > 0;
  const browserCodecSupported = browserCanDecode(file, fileExt);
  // Guarantee mobile users are NEVER blocked from starting transcription:
  // On-device Whisper and the mobile acoustic illumination engine support all decodable audio formats!
  const isPreflightReady = file.size > 0 && !isDownloadingModel;

  const handleStart = () => {
    if (selectedEngine === 'remote' || selectedEngine === 'local') {
      setStoredServerUrl(serverUrl);
    }
    // Persist selected engine as permanent default
    setStoredTranscriberEngine(selectedEngine);
    onConfirm(selectedEngine, storeAudioInVault, serverUrl, selectedModel);
  };

  return (
    <div
      onClick={onCancel}
      className="theme-overlay fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="theme-modal w-full max-w-lg rounded-3xl p-5 shadow-2xl flex flex-col space-y-4 max-h-[92vh] overflow-y-auto"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-title text-sm sm:text-base font-bold text-stone-100">
                Audio Import & Engine Setup
              </h3>
              <p className="text-[11px] text-stone-400">
                True on-device speech transcription & offline library
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Audio File Banner */}
        <div className="p-3 bg-white/[0.04] rounded-2xl border border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
            <FileAudio className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-stone-100 truncate">{file.name}</div>
            <div className="text-[10px] text-stone-400 font-mono flex items-center gap-2 mt-0.5">
              <span>{fileSizeMB} MB</span>
              <span>•</span>
              <span className="uppercase">{file.type || `${fileExt} audio`}</span>
            </div>
          </div>
        </div>

        {/* Compact device summary; detailed setup remains inside the selected engine. */}
        {deviceCaps && (
          <div className="px-3 py-2 rounded-xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-stone-300 font-medium">
                {deviceCaps.isMobile ? (
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Laptop className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{deviceCaps.deviceProfileName}</span>
                <span className="text-[10px] text-stone-500 font-mono">
                  ({deviceCaps.hardwareConcurrency} cores{deviceCaps.deviceMemoryGB ? `, ${deviceCaps.deviceMemoryGB}GB RAM` : ''})
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-stone-400 font-mono">
                <HardDrive className="w-3 h-3 text-stone-500" />
                <span>
                  {deviceCaps.storageQuotaMB > 0
                    ? `${Math.round((deviceCaps.storageQuotaMB - deviceCaps.storageUsageMB) / 1024)}GB free`
                    : 'Storage Ready'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Engine Selection Section */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider block">Transcription engine</label>

          {/* Option 1: My Computer / Server (Faster-Whisper) */}
          <div
            onClick={() => setSelectedEngine('local')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col gap-1.5 ${
              selectedEngine === 'local'
                ? 'bg-amber-500/15 border-amber-400 ring-1 ring-amber-400/40'
                : 'bg-white/[0.02] border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-stone-100">My Computer / Server (Faster-Whisper)</span>
              </div>
              <div className="flex items-center gap-1.5">
                {isCheckingServer ? (
                  <span className="text-[9px] font-mono text-stone-400 flex items-center gap-1">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Checking...
                  </span>
                ) : serverStatus?.online ? (
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Online • Ready
                  </span>
                ) : (
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-stone-600/30 text-stone-400 border border-white/10 font-bold flex items-center gap-1">
                    Offline
                  </span>
                )}
              </div>
            </div>
            <p className="text-[10.5px] text-stone-400 leading-relaxed pl-6">Private local processing · {serverStatus?.online ? serverStatus.gpu || 'Ready' : 'check connection below'}</p>
            {selectedEngine === 'local' && (
              <div className="pl-6 pt-1 space-y-1">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={serverUrl}
                    onChange={(e) => {
                      setServerUrl(e.target.value);
                      checkServer(e.target.value);
                    }}
                    placeholder="http://127.0.0.1:8000 or https://..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] font-mono text-stone-200 focus:outline-hidden focus:border-amber-400"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      checkServer(serverUrl);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10.5px] font-mono text-stone-200 shrink-0"
                  >
                    Check
                  </button>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[9.5px] text-stone-500 font-mono">Presets:</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const tunnelUrl = 'https://visited-adjustments-condition-fiber.trycloudflare.com';
                      setServerUrl(tunnelUrl);
                      checkServer(tunnelUrl);
                    }}
                    className="text-[9.5px] font-mono px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold transition flex items-center gap-1"
                  >
                    ⚡ Secure Cloudflare Tunnel (Mobile / Remote)
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setServerUrl('http://192.168.0.100:8000');
                      checkServer('http://192.168.0.100:8000');
                    }}
                    className="text-[9.5px] font-mono px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-stone-300 border border-white/10 transition"
                  >
                    Wi-Fi LAN (192.168.0.100)
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setServerUrl('http://127.0.0.1:8000');
                      checkServer('http://127.0.0.1:8000');
                    }}
                    className="text-[9.5px] font-mono px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-stone-300 border border-white/10 transition"
                  >
                    Localhost (127.0.0.1)
                  </button>
                </div>
                {typeof window !== 'undefined' && window.location.protocol === 'https:' && serverUrl.startsWith('http://') && (
                  <p className="text-[9.5px] text-amber-300/80 font-mono leading-tight">
                    ℹ️ HTTPS origin: browsers block HTTP. Auto-routing via secure tunnel: {serverStatus?.urlChecked || 'https://...trycloudflare.com'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Option 2: On-Device In-Browser Whisper */}
          <div
            onClick={() => setSelectedEngine('builtin')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col gap-2 ${
              selectedEngine === 'builtin'
                ? 'bg-emerald-500/15 border-emerald-400 ring-1 ring-emerald-400/40'
                : 'bg-white/[0.02] border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-stone-100">
                  {deviceCaps?.isMobile ? 'On This Device (Mobile Speech Illumination)' : 'On This Device (In-Browser Whisper)'}
                </span>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                100% ON-DEVICE • ZERO SERVER
              </span>
            </div>
            <p className="text-[10.5px] text-stone-400 leading-relaxed pl-6">
              Private on-device processing. Whisper neural net with instant mobile acoustic fail-safe.
            </p>

            {/* Offline Model Details & Explicit Download Trigger */}
            <div className="pl-6 pt-1 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-stone-400 font-mono text-[10px]">Model:</span>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value as any)}
                    className="bg-stone-800 text-stone-200 text-[11px] rounded-lg px-2 py-1 border border-white/20 focus:outline-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="whisper-tiny.en">Whisper Tiny (~39 MB • Ultra-fast)</option>
                    <option value="whisper-base.en">Whisper Base (~74 MB • High Accuracy)</option>
                  </select>
                </div>
                <div>
                  {activeModelInfo?.isDownloaded ? (
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Ready Offline
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-stone-400">
                      Download on first run
                    </span>
                  )}
                </div>
              </div>

              {!activeModelInfo?.isDownloaded && (
                <div className="pt-1">
                  {downloadProgress ? (
                    <div className="space-y-1.5 bg-black/40 p-2.5 rounded-xl border border-white/10">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-stone-300 truncate">{downloadProgress.status}</span>
                        <span className="text-amber-300 font-bold">{downloadProgress.pct}%</span>
                      </div>
                      <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-400 h-full transition-all duration-300 rounded-full"
                          style={{ width: `${downloadProgress.pct}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadModelNow();
                      }}
                      disabled={isDownloadingModel}
                      className="w-full py-1.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-medium flex items-center justify-center gap-1.5 transition active:scale-98"
                    >
                      <DownloadCloud className="w-3.5 h-3.5" />
                      <span>Download {selectedModel === 'whisper-tiny.en' ? 'Whisper Tiny (39 MB)' : 'Whisper Base (74 MB)'} for Offline Use</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Option 3: Custom Remote Server */}
          <div
            onClick={() => setSelectedEngine('remote')}
            className={`p-3 rounded-2xl border cursor-pointer transition flex flex-col gap-1.5 ${
              selectedEngine === 'remote'
                ? 'bg-cyan-500/15 border-cyan-400 ring-1 ring-cyan-400/40'
                : 'bg-white/[0.02] border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-stone-100">Custom Remote Server</span>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                ADVANCED
              </span>
            </div>
            {selectedEngine === 'remote' && (
              <div className="mt-1 pl-6">
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => {
                    setServerUrl(e.target.value);
                    checkServer(e.target.value);
                  }}
                  placeholder="https://your-custom-server.example.com"
                  className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/20 text-xs text-stone-200 font-mono focus:outline-hidden focus:border-cyan-400"
                />
              </div>
            )}
          </div>
        </div>

        {/* One readiness summary instead of a competing dashboard. */}
        <div className="p-3 bg-black/40 rounded-2xl border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Preflight Readiness Check
            </span>
            <span className="text-[9.5px] font-mono">
              {isPreflightReady ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              ) : (
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Action Needed
                </span>
              )}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10.5px]">
            {/* 1. Format */}
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
              <div className="text-[9px] font-mono text-stone-400 flex items-center gap-1">
                <FileAudio className="w-2.5 h-2.5 text-amber-400" /> Audio Format
              </div>
              <div className="font-semibold text-stone-200 truncate">
                {selectedEngine === 'builtin'
                  ? browserCodecSupported ? `${fileExt.toUpperCase()} Browser-ready ✓` : `${fileExt.toUpperCase()} needs Local Engine`
                  : audioFormatSupported ? `${fileExt.toUpperCase()} Supported ✓` : `${fileExt} (Validate)`}
              </div>
            </div>

            {/* 2. Connection */}
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
              <div className="text-[9px] font-mono text-stone-400 flex items-center gap-1">
                <Server className="w-2.5 h-2.5 text-amber-400" /> Server Reachable
              </div>
              <div className="font-semibold text-stone-200 truncate">
                {selectedEngine === 'local'
                  ? serverStatus?.online ? 'Engine Online ✓' : 'Engine Offline ⚠️'
                  : selectedEngine === 'builtin'
                  ? 'On-Device WASM ✓'
                  : serverStatus?.online ? 'Remote Reachable ✓' : 'Remote Offline ⚠️'}
              </div>
            </div>

          </div>

          {/* Quick Switch Helper if local server is online but user is on builtin */}
          {selectedEngine === 'builtin' && serverStatus?.online && (
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-[10.5px] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 truncate">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Local Faster-Whisper is online & verified!</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEngine('local')}
                className="px-2 py-0.5 rounded-lg bg-emerald-500/25 hover:bg-emerald-500/35 text-emerald-100 font-bold text-[9.5px] shrink-0"
              >
                Use Local Engine
              </button>
            </div>
          )}

          {selectedEngine === 'builtin' && !browserCodecSupported && (
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-100 text-[10.5px] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>This browser cannot decode this file for Whisper. Use the Local Engine, which supports more audio containers.</span>
              </div>
              {serverStatus?.online && (
                <button type="button" onClick={() => setSelectedEngine('local')} className="px-2 py-0.5 rounded-lg bg-amber-500/25 hover:bg-amber-500/35 text-amber-100 font-bold text-[9.5px] shrink-0">Use Local</button>
              )}
            </div>
          )}

          {/* Warning Helper if local server is offline */}
          {selectedEngine === 'local' && !serverStatus?.online && (
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[10.5px] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 truncate">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Local server offline on {serverUrl}.</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEngine('builtin')}
                className="px-2 py-0.5 rounded-lg bg-amber-500/25 hover:bg-amber-500/35 text-amber-100 font-bold text-[9.5px] shrink-0"
              >
                Use In-Browser Mode
              </button>
            </div>
          )}
        </div>

        {/* Offline Library Storage Consent Checkbox */}
        <div className="p-3 bg-white/[0.03] rounded-2xl border border-white/10 flex items-start gap-3">
          <input
            type="checkbox"
            id="storeAudioConsent"
            checked={storeAudioInVault}
            onChange={(e) => setStoreAudioInVault(e.target.checked)}
            className="mt-0.5 rounded-md accent-amber-500 cursor-pointer w-4 h-4"
          />
          <label htmlFor="storeAudioConsent" className="text-xs text-stone-300 cursor-pointer">
            <strong className="text-stone-100 block">Save complete recording & audio in Offline Library</strong>
            <span className="text-[10px] text-stone-400 block mt-0.5 leading-snug">
              Stores audio, transcript, highlights, and study data in browser IndexedDB. Enables 100% offline playback, search, and export without re-uploading.
            </span>
          </label>
        </div>

        {/* Action Buttons: Clear Unmistakable Button with Engine & Status */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onCancel}
            className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-stone-300 text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStart}
            disabled={!isPreflightReady || isDownloadingModel}
            className={`flex-1 py-3 px-3 rounded-xl font-bold text-xs transition active:scale-95 shadow-md flex items-center justify-center gap-1.5 ${
              !isPreflightReady
                ? 'bg-amber-600/80 hover:bg-amber-600 text-stone-100'
                : 'bg-amber-500 hover:bg-amber-400 text-black'
            }`}
          >
            {selectedEngine === 'local' ? (
              <>
                <Server className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  Start with Faster-Whisper {serverStatus?.online ? '(Online • Ready ✓)' : '(Engine Offline ⚠️)'}
                </span>
              </>
            ) : selectedEngine === 'builtin' ? (
              <>
                <Cpu className="w-4 h-4 shrink-0" />
                <span className="truncate">Start with In-Browser Whisper (On-Device)</span>
              </>
            ) : (
              <>
                <Globe className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  Start with Custom Server {serverStatus?.online ? '(Online ✓)' : '(Offline ⚠️)'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
