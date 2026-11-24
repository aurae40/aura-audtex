import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  HardDrive,
  Download,
  BookA,
  Server,
  BookOpen,
  Trash2,
  Cpu,
  Search,
  Upload,
  DownloadCloud,
  FileArchive,
  Smartphone,
  Laptop,
  CheckCircle2,
  Languages,
  Check,
  Loader2,
  Clock,
  FileText,
  ChevronRight,
  ChevronLeft,
  FolderArchive,
  Printer,
  Brain,
  GraduationCap,
  SlidersHorizontal,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import type { TranscriberEngine, LocalServerStatus } from '../services/transcriptionService';
import type { LexiconEntry, RecordingSessionSummary, WordToken, Marginalia, UserHighlight } from '../types';
import { exportLexiconAsAnki } from '../services/lexiconService';
import {
  getInstalledLanguagePacks,
  installLanguagePack,
  uninstallLanguagePack,
  type LanguagePackMetadata,
} from '../services/languagePacksService';
import {
  checkLocalServerHealth,
  getStoredServerUrl,
  setStoredServerUrl,
} from '../services/transcriptionService';
import {
  listAllRecordingSessions,
  deleteRecordingSession,
  getLibraryStorageStats,
  getRecordingSessionById,
} from '../services/sessionLibraryService';
import {
  exportSessionArchive,
  importSessionArchive,
  exportFullLibraryBackup,
} from '../services/sessionArchiveService';
import { exportSessionToPDF, createSampleSessionForPDF } from '../services/pdfExportService';
import {
  getAllOfflineModelsStatus,
  downloadModelForOffline,
  removeCachedModel,
  type OfflineModelInfo,
} from '../services/offlineModelManager';
import {
  getDeviceCapabilities,
  type DeviceCapabilities,
} from '../services/deviceCapabilityService';
import {
  listAllCachedCodices,
  deleteCachedCodex,
  getCachedByFingerprint,
} from '../services/codexCacheService';

interface VaultModalProps {
  onClose: () => void;
  accumulatedLexiconCount?: number;
  savedVocabularyCount?: number;
  savedVocabulary?: LexiconEntry[];
  transcriberEngine: TranscriberEngine;
  onSaveTranscriberEngine: (engine: TranscriberEngine) => void;
  onLoadCachedCodex?: (fingerprint: string) => void;
  onLoadSession?: (sessionId: string) => void;
  activeSession?: {
    title?: string;
    chapter?: string;
    fileName?: string;
    duration?: number;
    tokens?: WordToken[];
    marginalia?: Marginalia[];
    lexicon?: Record<string, LexiconEntry>;
    highlights?: UserHighlight[];
    userSummary?: string;
    engineUsed?: string;
  } | null;
}

export const VaultModal: React.FC<VaultModalProps> = ({
  onClose,
  accumulatedLexiconCount = 17,
  savedVocabularyCount = 2,
  savedVocabulary = [],
  transcriberEngine,
  onSaveTranscriberEngine,
  onLoadCachedCodex,
  onLoadSession,
  activeSession,
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'pdf' | 'models' | 'lexicon' | 'settings' | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState<string | null>(null);

  // Library State
  const [sessions, setSessions] = useState<RecordingSessionSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [storageStats, setStorageStats] = useState<{
    usedBytes: number;
    quotaBytes: number;
    percent: number;
    sessionCount: number;
  }>({ usedBytes: 0, quotaBytes: 0, percent: 0, sessionCount: 0 });
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Offline Models State
  const [offlineModels, setOfflineModels] = useState<OfflineModelInfo[]>([]);
  const [downloadingModelId, setDownloadingModelId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{ pct: number; msg: string } | null>(null);

  // Language Packs State
  const [languagePacks, setLanguagePacks] = useState<LanguagePackMetadata[]>([]);
  const [installingPackId, setInstallingPackId] = useState<string | null>(null);

  // Device & Engine State
  const [deviceCaps, setDeviceCaps] = useState<DeviceCapabilities | null>(null);
  const [serverUrlInput, setServerUrlInput] = useState(getStoredServerUrl);
  const [serverStatus, setServerStatus] = useState<LocalServerStatus | null>(null);
  const [isSavedServerUrl, setIsSavedServerUrl] = useState(false);
  const [isCheckingServer, setIsCheckingServer] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadLibraryData();
    loadOfflineModels();
    loadDeviceCaps();
    checkServer();
    setLanguagePacks(getInstalledLanguagePacks());
  }, []);

  const handleTogglePack = async (pack: LanguagePackMetadata) => {
    setInstallingPackId(pack.id);
    try {
      if (pack.isInstalled) {
        const updated = await uninstallLanguagePack(pack.id);
        setLanguagePacks(updated);
        setActionFeedback(`Removed ${pack.title} from offline storage.`);
      } else {
        const updated = await installLanguagePack(pack.id);
        setLanguagePacks(updated);
        setActionFeedback(`✓ Installed ${pack.title} for offline lookup.`);
      }
    } finally {
      setInstallingPackId(null);
    }
  };

  const loadLibraryData = async () => {
    try {
      const [list, stats] = await Promise.all([
        listAllRecordingSessions(),
        getLibraryStorageStats(),
      ]);

      if (list.length > 0) {
        setSessions(list);
      } else {
        // Fallback: migrate legacy cached codices into list view if library is empty
        const legacyList = await listAllCachedCodices();
        const converted: RecordingSessionSummary[] = legacyList.map((c) => ({
          id: `legacy_${c.fingerprint}`,
          fingerprint: c.fingerprint,
          title: c.title || c.fileName,
          chapter: c.chapter || 'Session',
          fileName: c.fileName,
          fileSize: c.fileSize,
          duration: c.duration,
          createdAt: c.processedAt,
          lastPlayedAt: c.processedAt,
          lastPlaybackPositionSec: 0,
          tokenCount: c.tokenCount,
          highlightCount: 0,
          reflectionCount: 0,
          hasAudio: c.hasAudio,
          engineUsed: 'Legacy Cache',
        }));
        setSessions(converted);
      }
      setStorageStats(stats);
    } catch (err) {
      console.warn('Failed to load library:', err);
    }
  };

  const loadOfflineModels = async () => {
    try {
      const models = await getAllOfflineModelsStatus();
      setOfflineModels(models);
    } catch (err) {
      console.warn('Failed to load offline models:', err);
    }
  };

  const loadDeviceCaps = async () => {
    try {
      const caps = await getDeviceCapabilities();
      setDeviceCaps(caps);
    } catch (err) {
      console.warn('Failed to load device capabilities:', err);
    }
  };

  const checkServer = async () => {
    setIsCheckingServer(true);
    try {
      const status = await checkLocalServerHealth(serverUrlInput);
      setServerStatus(status);
    } catch {
      setServerStatus({ online: false });
    } finally {
      setIsCheckingServer(false);
    }
  };

  const handleDownloadModel = async (modelId: 'whisper-tiny.en' | 'whisper-base.en') => {
    setDownloadingModelId(modelId);
    setDownloadProgress({ pct: 5, msg: 'Starting neural download...' });
    try {
      await downloadModelForOffline(modelId, (pct, msg) => {
        setDownloadProgress({ pct, msg });
      });
      await loadOfflineModels();
      setActionFeedback(`✓ ${modelId} downloaded & cached for 100% offline use.`);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error('Download model failed:', err);
      setActionFeedback(`Download failed: ${err instanceof Error ? err.message : String(err)}`);
      setTimeout(() => setActionFeedback(null), 5000);
    } finally {
      setDownloadingModelId(null);
      setDownloadProgress(null);
    }
  };

  const handleDeleteModel = async (modelId: 'whisper-tiny.en' | 'whisper-base.en') => {
    if (!window.confirm(`Delete ${modelId} from browser cache to reclaim storage?`)) return;
    try {
      await removeCachedModel(modelId);
      await loadOfflineModels();
      setActionFeedback(`✓ Removed ${modelId} from local cache.`);
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err) {
      console.warn('Delete model error:', err);
    }
  };

  const handleDeleteSession = async (id: string, fingerprint: string, title: string) => {
    if (!window.confirm(`Permanently remove "${title}" from your offline library?`)) return;
    try {
      if (id.startsWith('legacy_')) {
        await deleteCachedCodex(fingerprint);
      } else {
        await deleteRecordingSession(id);
      }
      await loadLibraryData();
      setActionFeedback(`✓ Removed "${title}" from library.`);
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err) {
      console.warn('Delete session error:', err);
    }
  };

  const handleExportArchive = async (sessionId: string) => {
    setActionFeedback('Packaging session archive (.aura)...');
    try {
      await exportSessionArchive(sessionId);
      setActionFeedback('✓ Session archive (.aura) downloaded.');
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error('Export archive error:', err);
      setActionFeedback(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  const handleImportArchiveFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActionFeedback('Importing session archive into offline library...');
    try {
      const imported = await importSessionArchive(file);
      await loadLibraryData();
      setActionFeedback(`✓ Imported "${imported.title}" into library.`);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error('Import archive error:', err);
      setActionFeedback(`Import error: ${err instanceof Error ? err.message : String(err)}`);
      setTimeout(() => setActionFeedback(null), 5000);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleBackupAll = async () => {
    setActionFeedback('Packaging full library backup...');
    try {
      await exportFullLibraryBackup();
      setActionFeedback('✓ Full library backup downloaded.');
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error('Backup error:', err);
      setActionFeedback(`Backup failed: ${err instanceof Error ? err.message : String(err)}`);
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  const handleExportSessionPDF = async (sessionSummary: RecordingSessionSummary) => {
    setIsExportingPDF(sessionSummary.id);
    setActionFeedback(`Generating illuminated PDF report for "${sessionSummary.title}"...`);
    try {
      if (sessionSummary.id.startsWith('legacy_')) {
        const cached = await getCachedByFingerprint(sessionSummary.fingerprint);
        if (!cached || !cached.result) {
          throw new Error('Cached recording data could not be retrieved.');
        }
        await exportSessionToPDF({
          title: cached.result.title || sessionSummary.title,
          chapter: cached.result.chapter || sessionSummary.chapter,
          fileName: sessionSummary.fileName,
          duration: sessionSummary.duration,
          tokens: cached.result.tokens,
          marginalia: cached.result.marginalia,
          lexicon: cached.result.lexicon,
          highlights: [],
          userSummary: '',
          engineUsed: sessionSummary.engineUsed,
          createdAt: sessionSummary.createdAt,
        });
      } else {
        const fullSession = await getRecordingSessionById(sessionSummary.id);
        if (!fullSession) {
          throw new Error('Session data could not be retrieved from vault.');
        }
        await exportSessionToPDF(fullSession);
      }
      setActionFeedback('✓ Illuminated PDF report downloaded.');
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error('PDF export error:', err);
      setActionFeedback(`PDF export failed: ${err instanceof Error ? err.message : String(err)}`);
      setTimeout(() => setActionFeedback(null), 5000);
    } finally {
      setIsExportingPDF(null);
    }
  };

  const handleExportActiveSessionPDF = async () => {
    if (!activeSession || !activeSession.tokens || activeSession.tokens.length === 0) return;
    setIsExportingPDF('active');
    setActionFeedback('Generating illuminated PDF report for active session...');
    try {
      await exportSessionToPDF({
        title: activeSession.title || 'Active Audio Recording',
        chapter: activeSession.chapter || 'Session',
        fileName: activeSession.fileName || 'Recording',
        duration: activeSession.duration || 0,
        tokens: activeSession.tokens,
        marginalia: activeSession.marginalia || [],
        lexicon: activeSession.lexicon || {},
        highlights: activeSession.highlights || [],
        userSummary: activeSession.userSummary,
        engineUsed: activeSession.engineUsed || 'Faster-Whisper Neural',
        createdAt: new Date().toISOString(),
      });
      setActionFeedback('✓ Current session illuminated PDF downloaded.');
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error('Active session PDF export error:', err);
      setActionFeedback(`PDF export failed: ${err instanceof Error ? err.message : String(err)}`);
      setTimeout(() => setActionFeedback(null), 5000);
    } finally {
      setIsExportingPDF(null);
    }
  };

  const handleExportSamplePDF = async () => {
    setIsExportingPDF('sample');
    setActionFeedback('Generating sample illuminated codex PDF...');
    try {
      const sample = createSampleSessionForPDF();
      await exportSessionToPDF(sample);
      setActionFeedback('✓ Sample illuminated PDF codex downloaded.');
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error('Sample PDF export error:', err);
      setActionFeedback(`PDF export failed: ${err instanceof Error ? err.message : String(err)}`);
      setTimeout(() => setActionFeedback(null), 5000);
    } finally {
      setIsExportingPDF(null);
    }
  };

  const handleOpenSession = (session: RecordingSessionSummary) => {
    onClose();
    if (onLoadSession && !session.id.startsWith('legacy_')) {
      onLoadSession(session.id);
    } else if (onLoadCachedCodex) {
      onLoadCachedCodex(session.fingerprint);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.chapter.toLowerCase().includes(q) || s.fileName.toLowerCase().includes(q);
  });

  const usedMB = (storageStats.usedBytes / (1024 * 1024)).toFixed(1);
  const quotaGB = (storageStats.quotaBytes / (1024 * 1024 * 1024)).toFixed(1);

  return (
    <div
      onClick={onClose}
      className="theme-overlay fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="theme-modal w-full max-w-2xl rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col space-y-4 max-h-[92vh] overflow-hidden"
      >
        {/* Modal Top Header */}
        <div className="flex items-start justify-between border-b border-black/10 dark:border-white/10 pb-4 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-600/10 to-orange-500/5 border border-amber-500/30 flex items-center justify-center text-amber-500 dark:text-amber-400 shadow-sm shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-sans text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                  Offline Library & Storage Vault
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  100% Offline
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-normal">
                Local recordings, neural speech models, flashcards & engine settings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-500/10 hover:bg-stone-500/20 border border-stone-500/20 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition flex items-center justify-center shrink-0 active:scale-95 cursor-pointer"
            aria-label="Close Vault"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Feedback Toast */}
        {actionFeedback && (
          <div className="px-3.5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-sans animate-in fade-in flex items-center justify-between">
            <span className="font-medium">{actionFeedback}</span>
            <button onClick={() => setActionFeedback(null)} className="text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Hidden file input for archive import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".aura,.json"
          onChange={handleImportArchiveFile}
          className="hidden"
        />

        {/* VIEW 1: INITIAL HUB — 5 WORKSPACE MODULES */}
        {activeTab === null ? (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1 animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-1 pb-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 font-sans">
                Vault Sections
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  title="Import a previously saved .aura archive"
                >
                  <Upload className="w-3 h-3" />
                  <span>Import .aura</span>
                </button>
                <span className="text-stone-300 dark:text-stone-700">•</span>
                <button
                  onClick={handleBackupAll}
                  className="text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  title="Download full library backup"
                >
                  <Download className="w-3 h-3" />
                  <span>Backup All</span>
                </button>
              </div>
            </div>

            {/* 1. Recordings & Transcripts */}
            <button
              onClick={() => setActiveTab('library')}
              className="w-full group p-3.5 sm:p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.025] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] border border-black/8 dark:border-white/8 hover:border-amber-500/40 transition-all duration-200 flex items-center justify-between text-left cursor-pointer active:scale-[0.995] shadow-xs hover:shadow-lg hover:shadow-amber-500/5"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-600/10 to-transparent border border-amber-500/30 flex items-center justify-center text-amber-500 dark:text-amber-300 group-hover:scale-105 transition-transform shrink-0 shadow-inner">
                  <FolderArchive className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                      Audio Recordings & Archives
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      {sessions.length} {sessions.length === 1 ? 'saved' : 'saved'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-normal truncate">
                    Saved audio codices, verbatim transcripts, milestones & .aura backups
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-amber-500 dark:group-hover:text-amber-300 group-hover:translate-x-1 transition-all shrink-0 ml-3" />
            </button>

            {/* 2. PDF Exporter */}
            <button
              onClick={() => setActiveTab('pdf')}
              className="w-full group p-3.5 sm:p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.025] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] border border-black/8 dark:border-white/8 hover:border-rose-500/40 transition-all duration-200 flex items-center justify-between text-left cursor-pointer active:scale-[0.995] shadow-xs hover:shadow-lg hover:shadow-rose-500/5"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500/20 via-rose-600/10 to-transparent border border-rose-500/30 flex items-center justify-center text-rose-500 dark:text-rose-300 group-hover:scale-105 transition-transform shrink-0 shadow-inner">
                  <Printer className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-rose-600 dark:group-hover:text-rose-300 transition-colors">
                      Illuminated PDF Studio
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 tracking-wide">
                      {activeSession ? 'CURRENT SESSION READY' : 'A4 EXECUTIVE'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-normal truncate">
                    {activeSession
                      ? `Ready to export "${activeSession.title || 'Current Session'}" with marginalia & quotes`
                      : 'Publication-grade A4 dossier reports with timestamps, marginalia & quotes'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-rose-500 dark:group-hover:text-rose-300 group-hover:translate-x-1 transition-all shrink-0 ml-3" />
            </button>

            {/* 3. AI Speech Models */}
            <button
              onClick={() => setActiveTab('models')}
              className="w-full group p-3.5 sm:p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.025] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] border border-black/8 dark:border-white/8 hover:border-emerald-500/40 transition-all duration-200 flex items-center justify-between text-left cursor-pointer active:scale-[0.995] shadow-xs hover:shadow-lg hover:shadow-emerald-500/5"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-600/10 to-transparent border border-emerald-500/30 flex items-center justify-center text-emerald-500 dark:text-emerald-300 group-hover:scale-105 transition-transform shrink-0 shadow-inner">
                  <Brain className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
                      On-Device Speech Models
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      {offlineModels.filter((m) => m.isDownloaded).length > 0
                        ? `${offlineModels.filter((m) => m.isDownloaded).length} OFFLINE READY`
                        : 'WEBGPU • ON-DEVICE'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-normal truncate">
                    {deviceCaps?.gpuLabel ? `${deviceCaps.gpuLabel} • ` : ''}Whisper neural weights cached for 100% offline transcription
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-300 group-hover:translate-x-1 transition-all shrink-0 ml-3" />
            </button>

            {/* 4. Study Lexicon */}
            <button
              onClick={() => setActiveTab('lexicon')}
              className="w-full group p-3.5 sm:p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.025] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] border border-black/8 dark:border-white/8 hover:border-sky-500/40 transition-all duration-200 flex items-center justify-between text-left cursor-pointer active:scale-[0.995] shadow-xs hover:shadow-lg hover:shadow-sky-500/5"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500/20 via-sky-600/10 to-transparent border border-sky-500/30 flex items-center justify-center text-sky-500 dark:text-sky-300 group-hover:scale-105 transition-transform shrink-0 shadow-inner">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors">
                      Study Lexicon & Flashcards
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                      {savedVocabularyCount} {savedVocabularyCount === 1 ? 'term' : 'terms'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-normal truncate">
                    Interactive vocabulary library, Leitner spaced-repetition & Anki export
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-sky-500 dark:group-hover:text-sky-300 group-hover:translate-x-1 transition-all shrink-0 ml-3" />
            </button>

            {/* 5. Engine Config */}
            <button
              onClick={() => setActiveTab('settings')}
              className="w-full group p-3.5 sm:p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.025] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] border border-black/8 dark:border-white/8 hover:border-purple-500/40 transition-all duration-200 flex items-center justify-between text-left cursor-pointer active:scale-[0.995] shadow-xs hover:shadow-lg hover:shadow-purple-500/5"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500/20 via-purple-600/10 to-transparent border border-purple-500/30 flex items-center justify-center text-purple-500 dark:text-purple-300 group-hover:scale-105 transition-transform shrink-0 shadow-inner">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                      Speech Engine & Hardware
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 uppercase tracking-wide">
                      {transcriberEngine} ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-normal truncate">
                    {serverStatus?.online
                      ? `Faster-Whisper connected on LAN • Engine: ${transcriberEngine}`
                      : 'In-Browser WebGPU Whisper active • Health checks & neural switching'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-purple-500 dark:group-hover:text-purple-300 group-hover:translate-x-1 transition-all shrink-0 ml-3" />
            </button>

            {/* Storage Footnote with Visual Progress Bar */}
            <div className="pt-3 border-t border-black/10 dark:border-white/10 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-sans">
                <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                  <HardDrive className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                  <span>
                    Storage Used: <strong className="text-stone-900 dark:text-stone-100 font-semibold font-mono">{usedMB} MB</strong>
                    {storageStats.quotaBytes > 0 && (
                      <span className="text-stone-400 dark:text-stone-500 font-mono ml-1">
                        (of {quotaGB} GB quota)
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium font-sans">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  <span>100% Private On-Device</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(1, storageStats.percent || 1))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          /* VIEW 2: REVEALED CHAMBER CONTENT WITH TOP BACK-TO-HUB BUTTON + PILLS */
          <>
            <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-2.5 gap-2">
              <button
                onClick={() => setActiveTab(null)}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 border border-amber-500/30 cursor-pointer shrink-0 shadow-sm"
                title="Return to Vault Hub"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>← Back to Vault Hub</span>
              </button>

              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none text-xs">
                <button
                  onClick={() => setActiveTab('library')}
                  className={`px-2.5 py-1 rounded-xl font-medium transition flex items-center gap-1 shrink-0 cursor-pointer ${
                    activeTab === 'library'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <BookOpen className="w-3 h-3" />
                  <span>Recordings</span>
                </button>
                <button
                  onClick={() => setActiveTab('pdf')}
                  className={`px-2.5 py-1 rounded-xl font-medium transition flex items-center gap-1 shrink-0 cursor-pointer ${
                    activeTab === 'pdf'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>PDF Exporter</span>
                </button>
                <button
                  onClick={() => setActiveTab('models')}
                  className={`px-2.5 py-1 rounded-xl font-medium transition flex items-center gap-1 shrink-0 cursor-pointer ${
                    activeTab === 'models'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Cpu className="w-3 h-3" />
                  <span>AI Models</span>
                </button>
                <button
                  onClick={() => setActiveTab('lexicon')}
                  className={`px-2.5 py-1 rounded-xl font-medium transition flex items-center gap-1 shrink-0 cursor-pointer ${
                    activeTab === 'lexicon'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <BookA className="w-3 h-3" />
                  <span>Lexicon</span>
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-2.5 py-1 rounded-xl font-medium transition flex items-center gap-1 shrink-0 cursor-pointer ${
                    activeTab === 'settings'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Server className="w-3 h-3" />
                  <span>Config</span>
                </button>
              </div>
            </div>

        {/* TAB 1: RECORDINGS LIBRARY */}
        {activeTab === 'library' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {/* Top Toolbar: Search, Storage Bar, Import & Backup */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search recordings by title or chapter..."
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-200 placeholder-stone-500 focus:outline-hidden focus:border-amber-400/50"
                  />
                </div>
                {/* Hidden File Input for .aura import */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".aura,.auraenc,.json"
                  onChange={handleImportArchiveFile}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition active:scale-95"
                  title="Import .aura Session Archive from another device"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-300" />
                  <span className="hidden sm:inline">Import</span> .aura
                </button>
                <button
                  onClick={() => setActiveTab('pdf')}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                  title="Open Illuminated PDF Exporter"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF Engine</span>
                </button>
                {sessions.length > 0 && (
                  <button
                    onClick={handleBackupAll}
                    className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition active:scale-95"
                    title="Export all recordings as a single backup"
                  >
                    <FileArchive className="w-3.5 h-3.5 text-emerald-300" />
                    <span className="hidden sm:inline">Backup All</span>
                  </button>
                )}
              </div>

              {/* Storage Usage Bar */}
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-[11px] font-mono text-stone-400">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    IndexedDB Storage: <strong className="text-stone-200">{usedMB} MB</strong> used
                    {storageStats.quotaBytes > 0 && ` of ~${quotaGB} GB available`}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">100% Offline & Private</span>
              </div>
            </div>

            {/* Active Session Illuminated PDF Banner (if active audio/tokens present) */}
            {activeSession && activeSession.tokens && activeSession.tokens.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase tracking-wider">
                      ● Active Recording Session
                    </span>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                      {activeSession.title || activeSession.fileName || 'Current Audio Session'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">
                    {activeSession.tokens.length.toLocaleString()} words synchronized
                    {activeSession.highlights && activeSession.highlights.length > 0 && ` • ${activeSession.highlights.length} highlights`}
                    {activeSession.lexicon && Object.keys(activeSession.lexicon).length > 0 && ` • ${Object.keys(activeSession.lexicon).length} terms`}
                  </p>
                </div>
                <button
                  onClick={handleExportActiveSessionPDF}
                  disabled={isExportingPDF === 'active'}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs transition active:scale-95 shadow flex items-center gap-1.5 self-start sm:self-center shrink-0 cursor-pointer"
                  title="Export Current Session as Illuminated PDF Report"
                >
                  {isExportingPDF === 'active' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
                  <span>Export PDF</span>
                </button>
              </div>
            )}

            {/* Recordings List */}
            {filteredSessions.length === 0 ? (
              <div className="text-center py-8 text-stone-400 space-y-3">
                <BookOpen className="w-8 h-8 mx-auto text-stone-600" />
                <p className="text-xs">
                  {searchQuery ? 'No recordings matched your search.' : 'No recordings saved in your offline library yet.'}
                </p>
                <div className="p-3.5 max-w-md mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 text-stone-300 space-y-2 text-left shadow-lg">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                    <FileText className="w-4 h-4 shrink-0" />
                    <span>Illuminated PDF Engine is Ready</span>
                  </div>
                  <p className="text-[11px] text-stone-400 leading-relaxed font-mono">
                    Generate publication-grade PDF documents with synchronized verbatim words, user highlights, milestone theses, and study vocabulary.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setActiveTab('pdf')}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition active:scale-95 shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Open PDF Exporter</span>
                    </button>
                    <button
                      onClick={handleExportSamplePDF}
                      disabled={isExportingPDF === 'sample'}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 border border-white/10 font-medium text-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isExportingPDF === 'sample' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span>Export Sample PDF</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredSessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">{s.title}</span>
                        {s.hasAudio ? (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                            🔊 Audio & Transcript Ready
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-stone-700 text-stone-300 font-bold">
                            📄 Transcript Only
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-stone-400 font-mono">
                        <span>{s.chapter}</span>
                        <span>•</span>
                        <span>{s.tokenCount.toLocaleString()} words</span>
                        <span>•</span>
                        <span>{(s.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                        {s.highlightCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-amber-300 font-bold">{s.highlightCount} highlights</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions: Resume, Export .aura, Delete */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        onClick={() => handleOpenSession(s)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition active:scale-95 shadow flex items-center gap-1.5"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Resume</span>
                      </button>
                      <button
                        onClick={() => handleExportSessionPDF(s)}
                        disabled={isExportingPDF === s.id}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition disabled:opacity-50 cursor-pointer flex items-center gap-1 font-bold text-xs"
                        title="Export Illuminated PDF Report (.pdf)"
                      >
                        {isExportingPDF === s.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span>PDF</span>
                      </button>
                      <button
                        onClick={() => handleExportArchive(s.id)}
                        className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-stone-300 hover:text-amber-300 border border-white/10 transition"
                        title="Export cross-device archive (.aura)"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSession(s.id, s.fingerprint, s.title)}
                        className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-rose-500/20 text-stone-400 hover:text-rose-300 border border-white/10 transition"
                        title="Delete recording and free storage"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ILLUMINATED PDF EXPORTER */}
        {activeTab === 'pdf' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Header Banner */}
            <div className="border-b border-white/10 pb-3 flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Illuminated Audio Codex PDF Engine</span>
                </h4>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Publishes synchronized verbatim words, timestamped milestone theses, user highlights, personal marginalia notes, and lexicon vocabulary into an illuminated A4 document.
                </p>
              </div>
            </div>

            {/* Active Session Export Card */}
            {activeSession && activeSession.tokens && activeSession.tokens.length > 0 ? (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/40 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase tracking-wider">
                      ● Active Listening Session
                    </span>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                      {activeSession.title || activeSession.fileName || 'Current Audio Session'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-300/80">
                    {activeSession.chapter || 'Session'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                    <div className="text-[10px] text-stone-400 font-mono">Spoken Words</div>
                    <div className="text-xs font-bold text-stone-900 dark:text-stone-100">{activeSession.tokens.length.toLocaleString()}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                    <div className="text-[10px] text-stone-400 font-mono">Highlights</div>
                    <div className="text-xs font-bold text-amber-400">{(activeSession.highlights || []).length}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                    <div className="text-[10px] text-stone-400 font-mono">Lexicon Terms</div>
                    <div className="text-xs font-bold text-emerald-400">{Object.keys(activeSession.lexicon || {}).length}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                    <div className="text-[10px] text-stone-400 font-mono">Transcriber</div>
                    <div className="text-[10px] font-bold text-stone-300 truncate">{activeSession.engineUsed || 'Neural Whisper'}</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <p className="text-[10px] text-stone-400 font-mono">
                    Includes full synchronized text, user notes, and executive summary.
                  </p>
                  <button
                    onClick={handleExportActiveSessionPDF}
                    disabled={isExportingPDF === 'active'}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs transition active:scale-95 shadow flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    {isExportingPDF === 'active' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>Export Active Session PDF</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-stone-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-stone-500" />
                    <span>No Audio Loaded in Current Reader</span>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    Upload an audio file on the main screen to illuminate your own words & notes, or export saved recordings below.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 text-xs font-medium transition cursor-pointer self-start sm:self-center shrink-0"
                >
                  Return to Player
                </button>
              </div>
            )}

            {/* Saved Vault Recordings List for PDF Export */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-stone-200">Export Saved Vault Recordings ({sessions.length})</h5>
                {sessions.length > 0 && (
                  <span className="text-[10px] text-stone-400 font-mono">Click Export PDF for any session</span>
                )}
              </div>

              {sessions.length === 0 ? (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-stone-400 text-xs">
                  No saved recordings in vault library yet. Recordings are automatically saved when audio is transcribed.
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">{s.title}</div>
                        <div className="text-[10px] text-stone-400 font-mono flex items-center gap-2">
                          <span>{s.chapter}</span>
                          <span>•</span>
                          <span>{s.tokenCount.toLocaleString()} words</span>
                          {s.highlightCount > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-amber-300">{s.highlightCount} highlights</span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleExportSessionPDF(s)}
                        disabled={isExportingPDF === s.id}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {isExportingPDF === s.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                        <span>Export PDF</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Test Sample Codex PDF Card */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-amber-500/20 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
                    <DownloadCloud className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-stone-900 dark:text-stone-100">Sample Illuminated Codex PDF</h5>
                    <p className="text-[10px] text-stone-400 font-mono">Explore Orwell's 1984 Manifesto with full annotations</p>
                  </div>
                </div>
                <button
                  onClick={handleExportSamplePDF}
                  disabled={isExportingPDF === 'sample'}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 border border-white/10 font-bold text-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isExportingPDF === 'sample' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
                  <span>Export Sample PDF</span>
                </button>
              </div>
              <p className="text-[10px] text-stone-400 leading-relaxed font-mono">
                Instantly downloads a pre-rendered illuminated A4 codex report containing synchronized speech tokens, milestone thesis decoders, highlighted citations, and Leitner vocabulary flashcards.
              </p>
            </div>

            {/* Included Codex Structure Details */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="text-[11px] font-bold text-stone-300 font-mono uppercase tracking-wider">
                Illuminated PDF Specification Structure
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono text-stone-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Cover & Structured Metadata Header</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Executive Cognitive Synthesis & Milestones</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>User Highlight Cards & Marginalia Notes</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Saved Study Lexicon & Phonetic Gloss</span>
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Synchronized Verbatim Transcript with [mm:ss] Timestamps</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AI SPEECH MODELS */}
        {activeTab === 'models' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="border-b border-white/10 pb-2">
              <h4 className="text-xs font-bold text-stone-200">On-Device Neural Speech Models</h4>
              <p className="text-[11px] text-stone-400">
                Download neural weights once to enable true 100% offline speech transcription on this device.
              </p>
            </div>

            {/* Device Capability Notice */}
            {deviceCaps && (
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-medium text-stone-200">
                  {deviceCaps.isMobile ? <Smartphone className="w-4 h-4 text-amber-400" /> : <Laptop className="w-4 h-4 text-amber-400" />}
                  <span>Detected Platform: {deviceCaps.deviceProfileName}</span>
                </div>
                <p className="text-[10px] text-stone-400 leading-relaxed font-mono">
                  Hardware: <span className="text-stone-200 font-semibold">{deviceCaps.gpuLabel}</span> • {deviceCaps.hardwareConcurrency} CPU threads • Recommended Model: <strong className="text-amber-300">{deviceCaps.recommendedModel}</strong>
                </p>
                {deviceCaps.deviceNotice && (
                  <p className="text-[10px] text-amber-300/90 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                    {deviceCaps.deviceNotice}
                  </p>
                )}
              </div>
            )}

            {/* Models Cards */}
            <div className="space-y-3">
              {offlineModels.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{m.name}</span>
                      <span className="text-[10px] text-stone-400 font-mono">({m.sizeFormatted})</span>
                    </div>
                    {m.isDownloaded ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Ready Offline
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-700 text-stone-300 font-bold">
                        Not Downloaded
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-stone-300 leading-relaxed">
                    Target: {m.target} • Speed: {m.speed}
                  </p>

                  {/* Download Progress / Actions */}
                  {downloadingModelId === m.id && downloadProgress ? (
                    <div className="space-y-1.5 bg-black/40 p-2.5 rounded-xl border border-white/10">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-stone-300 truncate">{downloadProgress.msg}</span>
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
                    <div className="flex items-center gap-2 pt-1">
                      {!m.isDownloaded ? (
                        <button
                          onClick={() => handleDownloadModel(m.id)}
                          className="py-1.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition active:scale-98"
                        >
                          <DownloadCloud className="w-3.5 h-3.5" />
                          <span>Download for Offline Use ({m.sizeFormatted})</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeleteModel(m.id)}
                          className="py-1.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition active:scale-98"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove from Cache</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: STUDY LEXICON & LANGUAGE PACKS */}
        {activeTab === 'lexicon' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* 1. Study Lexicon Deck Export */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookA className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100">Study Lexicon & Spaced Repetition</span>
                </div>
                <span className="text-[10px] font-mono text-amber-300">
                  {savedVocabulary.length} words saved ({accumulatedLexiconCount} recognized)
                </span>
              </div>
              <p className="text-[11px] text-stone-300 leading-relaxed">
                Export saved vocabulary directly to Anki (.tsv) or Markdown flashcards for active recall study.
              </p>
              <button
                onClick={() => exportLexiconAsAnki(savedVocabulary)}
                disabled={savedVocabulary.length === 0}
                className="py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-40 disabled:pointer-events-none border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition active:scale-98"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Anki Study Deck (.tsv)</span>
              </button>
            </div>

            {/* 2. Downloadable Offline Language Packs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Languages className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-stone-200">Offline Language Dictionary Packs</span>
                </div>
                <span className="text-[10px] font-mono text-stone-400">
                  {languagePacks.filter((p) => p.isInstalled).length} of {languagePacks.length} Installed
                </span>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Pre-packaged verified lexical definitions for speech recognition transcripts. Zero network latency and 100% on-device privacy.
              </p>

              <div className="space-y-2">
                {languagePacks.map((pack) => {
                  const isBusy = installingPackId === pack.id;
                  return (
                    <div
                      key={pack.id}
                      className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl leading-none">{pack.flag}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{pack.title}</span>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-stone-300">
                                {pack.language.toUpperCase()}
                              </span>
                            </div>
                            <span className="text-[10px] text-stone-400 font-mono">
                              v{pack.version} • {pack.entryCount} verified terms • {pack.sizeFormatted}
                            </span>
                          </div>
                        </div>

                        {pack.isInstalled ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" />
                              <span>Installed</span>
                            </span>
                            <button
                              onClick={() => handleTogglePack(pack)}
                              disabled={isBusy}
                              className="text-[10px] text-stone-400 hover:text-rose-300 px-1.5 py-0.5 rounded hover:bg-rose-500/10 transition"
                              title="Uninstall pack to free storage"
                            >
                              {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Remove'}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleTogglePack(pack)}
                            disabled={isBusy}
                            className="py-1 px-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-bold flex items-center gap-1.5 transition active:scale-95 shrink-0"
                          >
                            {isBusy ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Installing...</span>
                              </>
                            ) : (
                              <>
                                <DownloadCloud className="w-3 h-3" />
                                <span>Install Pack</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      <p className="text-[11px] text-stone-400 leading-relaxed pl-7">
                        {pack.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Saved Vocabulary Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-stone-200">Personal Vocabulary Cards</span>
                </div>
                <span className="text-[10px] font-mono text-stone-400">
                  {savedVocabulary.length} Saved
                </span>
              </div>

              {savedVocabulary.length === 0 ? (
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center space-y-1.5">
                  <BookOpen className="w-6 h-6 text-stone-500 mx-auto" />
                  <p className="text-xs text-stone-300 font-medium">No words saved yet</p>
                  <p className="text-[11px] text-stone-500">
                    Tap any word in the transcript and press "Save Word" to build your offline study library.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedVocabulary.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1.5"
                    >
                      <div className="flex items-baseline justify-between">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{entry.term}</span>
                          <span className="text-[10px] font-mono text-amber-400">{entry.phonetic}</span>
                          <span className="text-[10px] italic text-stone-400 font-book">{entry.partOfSpeech}</span>
                        </div>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                          SRS Stage {entry.srsStage || 1}
                        </span>
                      </div>

                      <p className="text-[11px] text-stone-200 leading-snug">
                        {entry.canonicalDefinition || entry.inContextMeaning}
                      </p>

                      {entry.sentence && (
                        <div className="text-[10px] text-stone-400 italic font-book bg-black/20 p-1.5 rounded-lg border border-white/5 flex items-start gap-1.5">
                          <Clock className="w-2.5 h-2.5 text-stone-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">"{entry.sentence}"</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ENGINE CONFIG */}
        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="space-y-3">
              <label className="text-[11px] font-mono font-bold text-stone-300 uppercase tracking-wider block">
                Primary Transcription Engine
              </label>

              {/* On-Device Whisper */}
              <div
                onClick={() => onSaveTranscriberEngine('builtin')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col gap-1.5 ${
                  transcriberEngine === 'builtin'
                    ? 'bg-emerald-500/15 border-emerald-400 ring-1 ring-emerald-400/40'
                    : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">On This Device (In-Browser Whisper)</span>
                  </div>
                  {transcriberEngine === 'builtin' && (
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                      ACTIVE DEFAULT
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed pl-6">
                  Recommended: Runs on WebAssembly inside this browser. Zero setup, 100% private.
                </p>
              </div>

              {/* Dedicated Faster-Whisper Server */}
              <div
                onClick={() => onSaveTranscriberEngine('local')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col gap-2 ${
                  transcriberEngine === 'local'
                    ? 'bg-amber-500/15 border-amber-400 ring-1 ring-amber-400/40'
                    : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">My Computer / Server (Faster-Whisper)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isCheckingServer ? (
                      <span className="text-[9px] font-mono text-stone-400">Pinging...</span>
                    ) : serverStatus?.online ? (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                        Online
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-stone-700 text-stone-400 font-bold">
                        Offline
                      </span>
                    )}
                    {transcriberEngine === 'local' && (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed pl-6">
                  Advanced: Connects to your local Python server on {serverUrlInput} with INT8 multi-threading.
                </p>
                <div className="pl-6 pt-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={serverUrlInput}
                    onChange={(e) => {
                      setServerUrlInput(e.target.value);
                      setIsSavedServerUrl(false);
                    }}
                    placeholder="http://127.0.0.1:8000"
                    className="flex-1 px-3 py-1 bg-black/50 border border-white/10 rounded-xl text-xs text-stone-200 font-mono focus:outline-hidden focus:border-amber-400"
                  />
                  <button
                    onClick={() => {
                      setStoredServerUrl(serverUrlInput);
                      setIsSavedServerUrl(true);
                      checkServer();
                      setTimeout(() => setIsSavedServerUrl(false), 2500);
                    }}
                    className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 text-xs font-medium transition"
                  >
                    {isSavedServerUrl ? 'Saved!' : 'Save & Ping'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    )}
  </div>
</div>
);
};
