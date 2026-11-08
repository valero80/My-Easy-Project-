import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Award,
  Bell,
  Calculator,
  Camera,
  CheckCircle2,
  Clock,
  Coffee,
  Command,
  Copy,
  CreditCard,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck2,
  FileDown,
  FileText,
  Fingerprint,
  Folder,
  FolderOpen,
  FolderPlus,
  Hash,
  IdCard,
  Image as ImageIcon,
  Keyboard,
  Layers,
  LogIn,
  LogOut,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Pin,
  Plus,
  Printer,
  QrCode,
  Radio,
  RefreshCw,
  RotateCcw,
  ScanFace,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  StickyNote,
  Trash2,
  TrendingUp,
  Upload,
  UserCheck,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { QRCodeSVG } from 'qrcode.react';
import { Currency, formatCurrency } from '../utils/i18n';
import { LocalAccountRecord } from './AuthPortal';
import {
  BiometricAttendanceRecord,
  COUNTRY_CDI_PAYROLL_NORMS,
  EmployeeRecord,
  PayslipRecord,
} from './ErpModules';
import {
  DocumentCustomizationConfig,
  exportBiometricAttendanceSheetToPDF,
  exportEmployeeBadgeToPDF,
  exportPayslipToPDF,
} from '../utils/exporters';
import {
  dispatchInstantMessage,
  triggerOptionalExternalChannelApp,
} from '../utils/instantMessagingService';
import {
  CompanyLetterheadConfig,
  printOfficialDocumentWithLetterhead,
} from './EnterpriseAdvancedOperationsSuite';

// ============================================================================
// 1. MODULE DE NOTES RAPIDES & ANNOTATIONS ÉPINGLÉES SUR LE TABLEAU DE BORD
// ============================================================================

export interface DashboardNoteAnnotation {
  id: string;
  authorName: string;
  authorRole: string;
  text: string;
  createdAt: string;
}

export interface DashboardCollaborativeNote {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  category:
    | 'Opérations & Chantier'
    | 'Finance & Devis'
    | 'Logistique & Stock'
    | 'RH & Pointage'
    | 'Direction Générale';
  priority: 'normal' | 'high' | 'urgent';
  colorTheme: 'amber' | 'blue' | 'emerald' | 'rose' | 'slate';
  pinned: boolean;
  targetProjectName: string;
  authorName: string;
  authorRole: string;
  annotations: DashboardNoteAnnotation[];
  createdAt: string;
  updatedAt: string;
}

const NOTE_THEME_STYLES: Record<
  DashboardCollaborativeNote['colorTheme'],
  { card: string; badge: string; border: string }
> = {
  amber: {
    card: 'bg-amber-50/90 dark:bg-amber-950/25',
    border: 'border-amber-200 dark:border-amber-800/70',
    badge: 'text-amber-800 dark:text-amber-300',
  },
  blue: {
    card: 'bg-blue-50/90 dark:bg-blue-950/25',
    border: 'border-blue-200 dark:border-blue-800/70',
    badge: 'text-blue-800 dark:text-blue-300',
  },
  emerald: {
    card: 'bg-emerald-50/90 dark:bg-emerald-950/25',
    border: 'border-emerald-200 dark:border-emerald-800/70',
    badge: 'text-emerald-800 dark:text-emerald-300',
  },
  rose: {
    card: 'bg-rose-50/90 dark:bg-rose-950/25',
    border: 'border-rose-200 dark:border-rose-800/70',
    badge: 'text-rose-800 dark:text-rose-300',
  },
  slate: {
    card: 'bg-slate-50/95 dark:bg-slate-900/80',
    border: 'border-slate-200 dark:border-slate-800',
    badge: 'text-slate-700 dark:text-slate-300',
  },
};

export const DashboardCollaborativeNotesWidget: React.FC<{
  tenantId: string;
  companyName: string;
  authorName: string;
  authorRole: string;
  projectNames: string[];
  externalComposerTrigger?: number;
  onTriggerToast?: (msg: string) => void;
}> = ({
  tenantId,
  companyName,
  authorName,
  authorRole,
  projectNames,
  externalComposerTrigger,
  onTriggerToast,
}) => {
  const storageKey = `mep_dashboard_collab_notes_${tenantId || 'default'}`;
  const [notes, setNotes] = useState<DashboardCollaborativeNote[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    const nowIso = new Date().toISOString();
    return [
      {
        id: 'note-welcome-1',
        tenantId: tenantId || 'default_tenant',
        title: 'Point de coordination — Suivi budgétaire & Pointages QR',
        content:
          'Vérifier les écarts fournitures/main-d’œuvre sur les rubriques actives et valider les pointages biométriques QR Code avant la clôture mensuelle des paies.',
        category: 'Direction Générale',
        priority: 'high',
        colorTheme: 'amber',
        pinned: true,
        targetProjectName: projectNames[0] || 'Tous les projets',
        authorName: authorName || 'Direction Générale',
        authorRole: authorRole || 'Super-Admin',
        annotations: [
          {
            id: 'ann-init-1',
            authorName: authorName || 'Direction Générale',
            authorRole: authorRole || 'Super-Admin',
            text: 'Les badges QR Code et le calcul automatique des paies sont activés.',
            createdAt: nowIso,
          },
        ],
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ];
  });

  const [showComposer, setShowComposer] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] =
    useState<DashboardCollaborativeNote['category']>('Opérations & Chantier');
  const [notePriority, setNotePriority] =
    useState<DashboardCollaborativeNote['priority']>('high');
  const [noteColor, setNoteColor] =
    useState<DashboardCollaborativeNote['colorTheme']>('amber');
  const [notePinned, setNotePinned] = useState(true);
  const [noteProject, setNoteProject] = useState<string>('Tous les projets');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [onlyPinned, setOnlyPinned] = useState<boolean>(false);
  const [annotationInputs, setAnnotationInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (externalComposerTrigger && externalComposerTrigger > 0) {
      setShowComposer(true);
    }
  }, [externalComposerTrigger]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(notes));
    } catch {
      // ignore
    }
  }, [notes, storageKey]);

  useEffect(() => {
    fetch(`/api/saas/dashboard-notes?tenantId=${encodeURIComponent(tenantId || 'default_tenant')}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.notes) && data.notes.length > 0) {
          setNotes(data.notes);
        }
      })
      .catch(() => {});

    let es: EventSource | null = null;
    try {
      if (typeof EventSource !== 'undefined') {
        es = new EventSource('/api/messaging/stream');
        es.addEventListener('dashboard_notes_updated', (ev: MessageEvent) => {
          try {
            const payload = JSON.parse(ev.data);
            if (
              payload &&
              (!payload.tenantId || payload.tenantId === tenantId) &&
              Array.isArray(payload.notes)
            ) {
              setNotes(payload.notes);
            }
          } catch {
            // ignore
          }
        });
      }
    } catch {
      // ignore
    }
    return () => {
      try {
        es?.close();
      } catch {
        // ignore
      }
    };
  }, [tenantId]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() && !noteContent.trim()) {
      onTriggerToast?.('Veuillez saisir un titre ou un contenu pour la note rapide.');
      return;
    }
    const nowIso = new Date().toISOString();
    const newNote: DashboardCollaborativeNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tenantId: tenantId || 'default_tenant',
      title: noteTitle.trim() || 'Note rapide d’équipe',
      content: noteContent.trim(),
      category: noteCategory,
      priority: notePriority,
      colorTheme: noteColor,
      pinned: notePinned,
      targetProjectName: noteProject,
      authorName: authorName || 'Collaborateur',
      authorRole: authorRole || 'Équipe Projet',
      annotations: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setNotes((prev) => [newNote, ...prev]);
    setNoteTitle('');
    setNoteContent('');
    setShowComposer(false);

    try {
      const res = await fetch('/api/saas/dashboard-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, note: newNote }),
      });
      const data = await res.json();
      if (data?.ok && Array.isArray(data.notes)) {
        setNotes(data.notes);
      }
    } catch {
      // persisted locally
    }

    onTriggerToast?.(
      `Note collaborative « ${newNote.title} » ${newNote.pinned ? 'épinglée' : 'publiée'} sur le Tableau de Bord.`
    );
  };

  const handleTogglePin = async (noteId: string) => {
    setNotes((prev) =>
      prev
        .map((n) => (n.id === noteId ? { ...n, pinned: !n.pinned, updatedAt: new Date().toISOString() } : n))
        .sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1))
    );
    try {
      const res = await fetch('/api/saas/dashboard-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, action: 'toggle_pin', noteId }),
      });
      const data = await res.json();
      if (data?.ok && Array.isArray(data.notes)) {
        setNotes(data.notes);
      }
    } catch {
      // ignore
    }
  };

  const handleAddAnnotation = async (noteId: string) => {
    const text = (annotationInputs[noteId] || '').trim();
    if (!text) return;
    const nowIso = new Date().toISOString();
    const newAnn: DashboardNoteAnnotation = {
      id: `ann-${Date.now()}`,
      authorName: authorName || 'Collaborateur',
      authorRole: authorRole || 'Équipe',
      text,
      createdAt: nowIso,
    };

    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? { ...n, annotations: [...(n.annotations || []), newAnn], updatedAt: nowIso }
          : n
      )
    );
    setAnnotationInputs((prev) => ({ ...prev, [noteId]: '' }));

    try {
      const res = await fetch('/api/saas/dashboard-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          action: 'add_annotation',
          noteId,
          annotationText: text,
          authorName,
          authorRole,
        }),
      });
      const data = await res.json();
      if (data?.ok && Array.isArray(data.notes)) {
        setNotes(data.notes);
      }
    } catch {
      // ignore
    }
    onTriggerToast?.('Annotation interne ajoutée et synchronisée en temps réel.');
  };

  const handleDeleteNote = async (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    try {
      await fetch(
        `/api/saas/dashboard-notes/${encodeURIComponent(noteId)}?tenantId=${encodeURIComponent(tenantId)}`,
        { method: 'DELETE' }
      );
    } catch {
      // ignore
    }
    onTriggerToast?.('Note rapide retirée du tableau de bord.');
  };

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (onlyPinned && !n.pinned) return false;
      if (categoryFilter !== 'all' && n.category !== categoryFilter) return false;
      return true;
    });
  }, [notes, onlyPinned, categoryFilter]);

  const pinnedCount = notes.filter((n) => n.pinned).length;

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <StickyNote className="w-4 h-4 text-amber-500" />
            <span>Collaboration Interne Temps Réel</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{pinnedCount} épinglée(s)</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{notes.length} note(s) active(s)</span>
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
            Notes Rapides &amp; Annotations Épinglées ({companyName})
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setOnlyPinned(false)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap ${
                !onlyPinned
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Toutes ({notes.length})
            </button>
            <button
              type="button"
              onClick={() => setOnlyPinned(true)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                onlyPinned
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Pin className="w-3 h-3" />
              <span>Épinglées ({pinnedCount})</span>
            </button>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <option value="all">Toutes les rubriques</option>
            <option value="Opérations & Chantier">Opérations &amp; Chantier</option>
            <option value="Finance & Devis">Finance &amp; Devis</option>
            <option value="Logistique & Stock">Logistique &amp; Stock</option>
            <option value="RH & Pointage">RH &amp; Pointage</option>
            <option value="Direction Générale">Direction Générale</option>
          </select>

          <button
            type="button"
            onClick={() => setShowComposer((prev) => !prev)}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showComposer ? 'Fermer l’éditeur' : 'Rédiger & Épingler une Note'}</span>
          </button>
        </div>
      </div>

      {showComposer && (
        <form
          onSubmit={handleCreateNote}
          className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-slate-50/90 dark:bg-slate-950 p-4 space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Titre de la note ou consigne interne *
              </label>
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Ex: Vérification livraison béton Lot 2 / Validation facture client..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Service / Rubrique
              </label>
              <select
                value={noteCategory}
                onChange={(e) => setNoteCategory(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold"
              >
                <option value="Opérations & Chantier">Opérations &amp; Chantier</option>
                <option value="Finance & Devis">Finance &amp; Devis</option>
                <option value="Logistique & Stock">Logistique &amp; Stock</option>
                <option value="RH & Pointage">RH &amp; Pointage</option>
                <option value="Direction Générale">Direction Générale</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Projet rattaché
              </label>
              <select
                value={noteProject}
                onChange={(e) => setNoteProject(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold"
              >
                <option value="Tous les projets">Tous les projets</option>
                {projectNames.map((pName) => (
                  <option key={pName} value={pName}>
                    {pName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              Contenu détaillé de l&apos;annotation *
            </label>
            <textarea
              rows={2}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Saisissez votre note rapide ou instruction pour les collaborateurs..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Couleur :</span>
                {(['amber', 'blue', 'emerald', 'rose', 'slate'] as const).map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setNoteColor(col)}
                    className={`px-2 py-0.5 rounded border text-[11px] font-semibold cursor-pointer ${
                      noteColor === col
                        ? 'border-slate-900 dark:border-white font-bold'
                        : 'border-slate-200 dark:border-slate-700 opacity-75'
                    }`}
                  >
                    {col === 'amber'
                      ? 'Ambre'
                      : col === 'blue'
                        ? 'Bleu'
                        : col === 'emerald'
                          ? 'Émeraude'
                          : col === 'rose'
                            ? 'Corail'
                            : 'Ardoise'}
                  </button>
                ))}
              </div>

              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notePinned}
                  onChange={(e) => setNotePinned(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Épingler en haut du Tableau de Bord</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowComposer(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Pin className="w-3.5 h-3.5" />
                <span>Publier &amp; Épingler</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {filteredNotes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center space-y-2">
          <StickyNote className="w-6 h-6 text-slate-400 mx-auto" />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Aucune note rapide ou annotation dans ce filtre
          </p>
          <button
            type="button"
            onClick={() => setShowComposer(true)}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
          >
            Créer la première note épinglée
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const theme = NOTE_THEME_STYLES[note.colorTheme] || NOTE_THEME_STYLES.amber;
            return (
              <article
                key={note.id}
                className={`rounded-xl border ${theme.border} ${theme.card} p-4 flex flex-col justify-between gap-3 transition-transform duration-150`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
                      <span className={`font-bold ${theme.badge}`}>{note.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{note.targetProjectName}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTogglePin(note.id)}
                        title={note.pinned ? 'Désépingler la note' : 'Épingler en tête'}
                        className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                          note.pinned
                            ? 'border-amber-400 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        title="Supprimer cette note"
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {note.title}
                  </h3>

                  <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                    {note.content}
                  </p>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 flex items-center justify-between">
                    <span>
                      Par <strong className="text-slate-700 dark:text-slate-200">{note.authorName}</strong> ({note.authorRole})
                    </span>
                    <span className="font-mono tabular-nums">
                      {new Date(note.updatedAt || note.createdAt).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* Fil d'annotations collaboratives sur la note */}
                <div className="border-t border-slate-200/70 dark:border-slate-800 pt-2.5 space-y-2">
                  {Array.isArray(note.annotations) && note.annotations.length > 0 && (
                    <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                      {note.annotations.map((ann) => (
                        <div
                          key={ann.id}
                          className="rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 px-2.5 py-1.5 text-[11px]"
                        >
                          <div className="flex items-center justify-between text-slate-500">
                            <strong className="text-slate-800 dark:text-slate-200">
                              {ann.authorName}
                            </strong>
                            <span className="font-mono tabular-nums text-[10px]">
                              {new Date(ann.createdAt).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 mt-0.5">{ann.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={annotationInputs[note.id] || ''}
                      onChange={(e) =>
                        setAnnotationInputs((prev) => ({ ...prev, [note.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleAddAnnotation(note.id);
                        }
                      }}
                      placeholder="Annoter cette note (Entrée)..."
                      className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddAnnotation(note.id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                    >
                      Annoter
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

// ============================================================================
// 2. INTERFACE DE PERSONNALISATION DES RACCOURCIS CLAVIER DANS LES PARAMÈTRES
// ============================================================================

export type ShortcutActionId =
  | 'goto_dashboard'
  | 'goto_projects'
  | 'goto_documents'
  | 'goto_attendance_qr'
  | 'goto_payroll'
  | 'goto_internal_chat'
  | 'new_pinned_note'
  | 'goto_accounting'
  | 'open_letterhead'
  | 'goto_security_settings';

export interface CustomShortcutDefinition {
  id: ShortcutActionId;
  label: string;
  description: string;
  category: 'Navigation Rapide' | 'Opérations & Pointage' | 'Communication & Finance';
  defaultCombo: string;
  currentCombo: string;
}

export const DEFAULT_KEYBOARD_SHORTCUTS: CustomShortcutDefinition[] = [
  {
    id: 'goto_dashboard',
    label: 'Ouvrir le Tableau de Bord & Notes Épinglées',
    description: 'Bascule immédiatement vers le cockpit principal et les indicateurs financiers.',
    category: 'Navigation Rapide',
    defaultCombo: 'Alt+D',
    currentCombo: 'Alt+D',
  },
  {
    id: 'goto_projects',
    label: 'Ouvrir le Module Projets, Gantt & Évaluation',
    description: 'Accède directement à la liste des projets et au diagramme de Gantt temps réel.',
    category: 'Navigation Rapide',
    defaultCombo: 'Alt+P',
    currentCombo: 'Alt+P',
  },
  {
    id: 'goto_documents',
    label: 'Ouvrir Facturation, Devis & Devises Temps Réel',
    description: 'Accède aux devis, factures proforma, décomptes et sélecteur de devises client.',
    category: 'Communication & Finance',
    defaultCombo: 'Alt+F',
    currentCombo: 'Alt+F',
  },
  {
    id: 'goto_attendance_qr',
    label: 'Ouvrir le Pointage Biométrique & Scanner QR Badge',
    description: 'Ouvre la borne de pointage biométrique et lecteur QR Code (Arrivée, Pause, Départ).',
    category: 'Opérations & Pointage',
    defaultCombo: 'Alt+B',
    currentCombo: 'Alt+B',
  },
  {
    id: 'goto_payroll',
    label: 'Ouvrir le Calcul Automatique des Paies (RH)',
    description: 'Ouvre le module de paie relié au pointage biométrique et aux lettres d’embauche.',
    category: 'Opérations & Pointage',
    defaultCombo: 'Alt+R',
    currentCombo: 'Alt+R',
  },
  {
    id: 'goto_internal_chat',
    label: 'Ouvrir la Messagerie Instantanée Interne Twilio',
    description: 'Ouvre le centre de messagerie instantanée interne Twilio, WhatsApp, SMS et E-mail.',
    category: 'Communication & Finance',
    defaultCombo: 'Alt+M',
    currentCombo: 'Alt+M',
  },
  {
    id: 'new_pinned_note',
    label: 'Rédiger & Épingler une Note Rapide sur le Tableau de Bord',
    description: 'Ouvre directement l’éditeur de note collaborative épinglée sur le Tableau de Bord.',
    category: 'Opérations & Pointage',
    defaultCombo: 'Alt+N',
    currentCombo: 'Alt+N',
  },
  {
    id: 'goto_accounting',
    label: 'Ouvrir Comptabilité & Liasse Fiscale Automatique',
    description: 'Accède au Livre-Journal, Grand Livre, Balance, Bilan et déclarations fiscales.',
    category: 'Communication & Finance',
    defaultCombo: 'Alt+C',
    currentCombo: 'Alt+C',
  },
  {
    id: 'open_letterhead',
    label: 'Ouvrir le Studio Logo & Papier Entête Officiel',
    description: 'Ouvre la configuration du logo et du modèle de papier entête de l’entreprise.',
    category: 'Navigation Rapide',
    defaultCombo: 'Alt+L',
    currentCombo: 'Alt+L',
  },
  {
    id: 'goto_security_settings',
    label: 'Ouvrir Paramètres, Points d’Accès & Raccourcis Clavier',
    description: 'Accède aux paramètres généraux, sécurité, audit de connexion et raccourcis.',
    category: 'Navigation Rapide',
    defaultCombo: 'Alt+S',
    currentCombo: 'Alt+S',
  },
];

export function loadUserKeyboardShortcuts(
  tenantId: string,
  userId: string
): CustomShortcutDefinition[] {
  try {
    const raw = localStorage.getItem(`mep_shortcuts_${tenantId}_${userId}`);
    if (raw) {
      const parsed: Record<string, string> = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return DEFAULT_KEYBOARD_SHORTCUTS.map((def) => ({
          ...def,
          currentCombo: parsed[def.id] || def.defaultCombo,
        }));
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_KEYBOARD_SHORTCUTS;
}

export function formatKeyboardEventCombo(e: KeyboardEvent | React.KeyboardEvent): string | null {
  const ignoredKeys = new Set(['Control', 'Alt', 'Shift', 'Meta']);
  if (ignoredKeys.has(e.key)) return null;
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  if (parts.length === 0) {
    // Require at least Alt or Ctrl so normal typing isn't hijacked
    return null;
  }
  const cleanKey = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  parts.push(cleanKey);
  return parts.join('+');
}

export const CustomKeyboardShortcutsSettingsPanel: React.FC<{
  tenantId: string;
  userId: string;
  shortcuts: CustomShortcutDefinition[];
  onUpdateShortcuts: (next: CustomShortcutDefinition[]) => void;
  onExecuteShortcutAction: (actionId: ShortcutActionId) => void;
  onTriggerToast?: (msg: string) => void;
}> = ({
  tenantId,
  userId,
  shortcuts,
  onUpdateShortcuts,
  onExecuteShortcutAction,
  onTriggerToast,
}) => {
  const [recordingId, setRecordingId] = useState<ShortcutActionId | null>(null);

  const persistShortcuts = async (nextList: CustomShortcutDefinition[]) => {
    onUpdateShortcuts(nextList);
    const mapObj: Record<string, string> = {};
    nextList.forEach((s) => {
      mapObj[s.id] = s.currentCombo;
    });
    try {
      localStorage.setItem(`mep_shortcuts_${tenantId}_${userId}`, JSON.stringify(mapObj));
    } catch {
      // ignore
    }
    try {
      await fetch('/api/saas/keyboard-shortcuts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, userId, shortcuts: mapObj }),
      });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!recordingId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        setRecordingId(null);
        return;
      }
      const combo = formatKeyboardEventCombo(e);
      if (!combo) {
        onTriggerToast?.(
          'Combinez Alt, Ctrl ou Shift avec une touche (ex: Alt+P, Ctrl+Shift+K).'
        );
        return;
      }
      const conflict = shortcuts.find((s) => s.id !== recordingId && s.currentCombo === combo);
      if (conflict) {
        onTriggerToast?.(
          `La combinaison ${combo} est déjà utilisée pour « ${conflict.label} ».`
        );
        return;
      }
      const next = shortcuts.map((s) =>
        s.id === recordingId ? { ...s, currentCombo: combo } : s
      );
      void persistShortcuts(next);
      setRecordingId(null);
      onTriggerToast?.(`Raccourci clavier personnalisé enregistré : ${combo}`);
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [recordingId, shortcuts]);

  const handleResetDefaults = () => {
    void persistShortcuts(DEFAULT_KEYBOARD_SHORTCUTS);
    onTriggerToast?.('Tous les raccourcis clavier ont été restaurés aux valeurs par défaut.');
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Keyboard className="w-4 h-4 text-blue-600" />
            <span>Ergonomie &amp; Productivité Personnalisée</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
            Personnalisation des Raccourcis Clavier (Actions Fréquentes)
          </h3>
          <p className="text-xs text-slate-500">
            Cliquez sur « Modifier la touche » puis appuyez sur la combinaison souhaitée (ex: Alt+P, Ctrl+Alt+B). Les raccourcis sont actifs partout dans l&apos;application.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 self-start"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Réinitialiser par défaut</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 bg-slate-50/70 dark:bg-slate-950/50">
              <th className="py-2.5 px-3">Catégorie</th>
              <th className="py-2.5 px-3">Action Fréquente</th>
              <th className="py-2.5 px-3">Combinaison Actuelle</th>
              <th className="py-2.5 px-3 text-right">Personnalisation &amp; Test</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {shortcuts.map((sc) => {
              const isRec = recordingId === sc.id;
              return (
                <tr
                  key={sc.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {sc.category}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-900 dark:text-white">{sc.label}</div>
                    <div className="text-[11px] text-slate-500">{sc.description}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <kbd className="px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 font-mono font-bold text-xs text-blue-700 dark:text-blue-300">
                      {isRec ? 'Appuyez sur vos touches...' : sc.currentCombo}
                    </kbd>
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setRecordingId(isRec ? null : sc.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                          isRec
                            ? 'bg-amber-600 text-white'
                            : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        {isRec ? 'Annuler (Échap)' : 'Modifier la touche'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onExecuteShortcutAction(sc.id)}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                      >
                        Tester
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// 3. POINTAGE BIOMÉTRIQUE INTELLIGENT + QR CODE SUR LES BADGES (PERSONNEL &
//    COLLABORATEURS) + CALCUL AUTOMATIQUE DES PAIES
// ============================================================================

export function buildBadgeQrPayload(params: {
  tenantId: string;
  matricule: string;
  fullName: string;
  roleOrPosition: string;
  contractType: string;
}): string {
  return `MEP-QR-BIO|v2|${params.tenantId || 'default'}|${params.matricule}|${params.fullName}|${params.contractType}|${params.roleOrPosition}`;
}

export function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const parts = timeStr.split(':').map((n) => parseInt(n, 10));
  if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null;
  return parts[0] * 60 + parts[1];
}

export function computeNetWorkedAndOvertimeHours(params: {
  checkInTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
  checkOutTime?: string;
}): {
  breakDurationMinutes: number;
  netWorkedHours: number;
  overtimeHours: number;
} {
  const inMin = parseTimeToMinutes(params.checkInTime);
  const outMin = parseTimeToMinutes(params.checkOutTime);
  const bStart = parseTimeToMinutes(params.breakStartTime);
  const bEnd = parseTimeToMinutes(params.breakEndTime);

  let breakDurationMinutes = 0;
  if (bStart !== null && bEnd !== null && bEnd >= bStart) {
    breakDurationMinutes = bEnd - bStart;
  }

  if (inMin === null || outMin === null || outMin <= inMin) {
    return {
      breakDurationMinutes,
      netWorkedHours: 0,
      overtimeHours: 0,
    };
  }

  const grossMinutes = outMin - inMin;
  const netMinutes = Math.max(0, grossMinutes - breakDurationMinutes);
  const netWorkedHours = Number((netMinutes / 60).toFixed(2));
  const overtimeHours = Number(Math.max(0, netWorkedHours - 8).toFixed(2));

  return {
    breakDurationMinutes,
    netWorkedHours,
    overtimeHours,
  };
}

export const IntelligentBiometricQrAndBadgeCenter: React.FC<{
  tenantId: string;
  companyName: string;
  companyLogo?: string;
  currency: Currency;
  countryCode: string;
  employees: EmployeeRecord[];
  collaboratorAccounts: LocalAccountRecord[];
  attendanceRecords: BiometricAttendanceRecord[];
  onUpdateAttendanceRecords: (next: BiometricAttendanceRecord[]) => void;
  payslips: PayslipRecord[];
  onUpdatePayslips: (next: PayslipRecord[]) => void;
  docCustomization: DocumentCustomizationConfig;
  letterhead: CompanyLetterheadConfig;
  onRecordAuditTrace?: (
    module:
      | 'DEVIS_FACTURE'
      | 'DOCUMENT'
      | 'MAGASIN_STOCK'
      | 'COMMANDE_FOURNISSEUR'
      | 'RH_EMPLOYE'
      | 'PAIE'
      | 'PROJET'
      | 'SECURITE'
      | 'SECURITE_ACCES'
      | 'GOUVERNANCE_SYSTEME',
    action: string,
    reference: string,
    details: string
  ) => void;
  onTriggerToast?: (msg: string) => void;
}> = ({
  tenantId,
  companyName,
  companyLogo,
  currency,
  countryCode,
  employees,
  collaboratorAccounts,
  attendanceRecords,
  onUpdateAttendanceRecords,
  payslips,
  onUpdatePayslips,
  docCustomization,
  letterhead,
  onRecordAuditTrace,
  onTriggerToast,
}) => {
  // Unified list of badge holders (Personnel RH + Collaborateurs Utilisateurs)
  const unifiedBadgeHolders = useMemo(() => {
    const list: Array<{
      id: string;
      matricule: string;
      fullName: string;
      position: string;
      department: string;
      contractType: string;
      projectName: string;
      phone: string;
      email: string;
      bloodGroup: string;
      nationalIdNumber: string;
      hireDate: string;
      baseSalary: number;
      transportAllowance: number;
      workerCategory: string;
      photoDataUrl?: string;
      holderCategory: 'personnel_rh' | 'collaborateur_user';
      qrPayload: string;
    }> = [];

    const seenMatricules = new Set<string>();

    employees
      .filter((e) => e.status !== 'terminated')
      .forEach((emp) => {
        seenMatricules.add(emp.matricule);
        list.push({
          id: emp.id,
          matricule: emp.matricule,
          fullName: emp.fullName,
          position: emp.position,
          department: emp.department,
          contractType: emp.contractType,
          projectName: emp.assignedProjectName || 'Direction Technique',
          phone: emp.phone,
          email: emp.email,
          bloodGroup: emp.bloodGroup || 'O+',
          nationalIdNumber: emp.nationalIdNumber || 'CNI-CERTIFIE',
          hireDate: emp.hireDate,
          baseSalary: emp.baseSalary || 350000,
          transportAllowance: emp.transportAllowance || 30000,
          workerCategory: emp.workerCategory || 'Personnel Technique',
          photoDataUrl: emp.photoDataUrl,
          holderCategory: 'personnel_rh',
          qrPayload: buildBadgeQrPayload({
            tenantId,
            matricule: emp.matricule,
            fullName: emp.fullName,
            roleOrPosition: emp.position,
            contractType: emp.contractType,
          }),
        });
      });

    collaboratorAccounts.forEach((acc, idx) => {
      const mat = acc.employeeMatricule || `COLLAB-${String(idx + 1).padStart(3, '0')}`;
      if (seenMatricules.has(mat)) return;
      seenMatricules.add(mat);
      list.push({
        id: acc.id,
        matricule: mat,
        fullName: acc.fullName,
        position: acc.functionTitle || acc.role.toUpperCase(),
        department: acc.department || 'Opérations & Projets',
        contractType: 'CDI',
        projectName: 'Multi-Projets Entreprise',
        phone: `${acc.phoneDialCode || '+225'} ${acc.phoneNumber || ''}`.trim(),
        email: acc.email,
        bloodGroup: 'O+',
        nationalIdNumber: `ID-${mat}`,
        hireDate: (acc.createdAt || new Date().toISOString()).slice(0, 10),
        baseSalary: 450000,
        transportAllowance: 35000,
        workerCategory: 'Collaborateur Habilitée',
        holderCategory: 'collaborateur_user',
        qrPayload: buildBadgeQrPayload({
          tenantId,
          matricule: mat,
          fullName: acc.fullName,
          roleOrPosition: acc.functionTitle || acc.role,
          contractType: 'CDI Collaborateur',
        }),
      });
    });

    return list;
  }, [employees, collaboratorAccounts, tenantId]);

  const [selectedHolderMatricule, setSelectedHolderMatricule] = useState<string>(
    unifiedBadgeHolders[0]?.matricule || ''
  );
  const [validationMethod, setValidationMethod] = useState<'qr_code' | 'fingerprint' | 'face'>(
    'qr_code'
  );
  const [qrInputString, setQrInputString] = useState<string>('');
  const [customTimeOverride, setCustomTimeOverride] = useState<string>('');
  const [activeSubView, setActiveSubView] = useState<
    'terminal_and_qr' | 'badges_gallery' | 'biometric_payroll'
  >('terminal_and_qr');

  useEffect(() => {
    if (!selectedHolderMatricule && unifiedBadgeHolders.length > 0) {
      setSelectedHolderMatricule(unifiedBadgeHolders[0].matricule);
      setQrInputString(unifiedBadgeHolders[0].qrPayload);
    }
  }, [unifiedBadgeHolders, selectedHolderMatricule]);

  // Synchronisation serveur des pointages biométriques
  useEffect(() => {
    fetch(`/api/saas/biometric-attendance?tenantId=${encodeURIComponent(tenantId || 'default_tenant')}`)
      .then((r) => r.json())
      .then((data) => {
        if (
          data?.ok &&
          Array.isArray(data.records) &&
          data.records.length > 0 &&
          attendanceRecords.length === 0
        ) {
          onUpdateAttendanceRecords(data.records);
        }
      })
      .catch(() => {});
  }, [tenantId]);

  const selectedHolder = useMemo(
    () =>
      unifiedBadgeHolders.find((h) => h.matricule === selectedHolderMatricule) ||
      unifiedBadgeHolders[0] ||
      null,
    [unifiedBadgeHolders, selectedHolderMatricule]
  );

  // Automatic calculation of payroll from biometric & QR attendance records
  const biometricPayrollSummary = useMemo(() => {
    const norm = COUNTRY_CDI_PAYROLL_NORMS[countryCode] || COUNTRY_CDI_PAYROLL_NORMS.DEFAULT;
    return unifiedBadgeHolders.map((holder) => {
      const empRecords = attendanceRecords.filter(
        (r) => r.employeeMatricule === holder.matricule || r.employeeName === holder.fullName
      );
      const daysPointed = empRecords.length;
      let totalNetHours = 0;
      let totalOvertimeHours = 0;
      let totalBreakMinutes = 0;
      let lateDays = 0;

      empRecords.forEach((rec) => {
        const calc = computeNetWorkedAndOvertimeHours({
          checkInTime: rec.checkInTime,
          breakStartTime: rec.breakStartTime,
          breakEndTime: rec.breakEndTime,
          checkOutTime: rec.checkOutTime,
        });
        const netH =
          typeof rec.netWorkedHours === 'number' && rec.netWorkedHours > 0
            ? rec.netWorkedHours
            : calc.netWorkedHours || (rec.checkOutTime ? 8 : 4);
        const overH =
          typeof rec.overtimeHours === 'number' ? rec.overtimeHours : calc.overtimeHours;
        const brkM =
          typeof rec.breakDurationMinutes === 'number'
            ? rec.breakDurationMinutes
            : calc.breakDurationMinutes;

        totalNetHours += netH;
        totalOvertimeHours += overH;
        totalBreakMinutes += brkM;

        const inMinutes = parseTimeToMinutes(rec.checkInTime);
        if (inMinutes !== null && inMinutes > 8 * 60 + 15) {
          lateDays += 1;
        }
      });

      const hourlyRate = Math.round(holder.baseSalary / (norm.legalHoursMonth || 173.33));
      const overtimePay = Math.round(totalOvertimeHours * hourlyRate * 1.25);
      const punctualityBonus =
        daysPointed > 0 && lateDays === 0 ? Math.round(holder.baseSalary * 0.04) : 0;
      const latenessDeduction = lateDays > 0 ? Math.round(lateDays * hourlyRate * 0.5) : 0;

      const effectiveBaseSalary =
        holder.contractType === 'Temporaire / Journalier'
          ? Math.max(daysPointed, 1) * holder.baseSalary
          : holder.baseSalary;

      const grossSalary = Math.max(
        0,
        effectiveBaseSalary +
          holder.transportAllowance +
          overtimePay +
          punctualityBonus -
          latenessDeduction
      );
      const employeeSocial = Math.round((grossSalary * norm.employeeSocialPct) / 100);
      const employerSocial = Math.round((grossSalary * norm.employerSocialPct) / 100);
      const incomeTax = Math.round((grossSalary * norm.incomeTaxPct) / 100);
      const netSalary = Math.max(0, grossSalary - employeeSocial - incomeTax);

      return {
        holder,
        daysPointed,
        totalNetHours: Number(totalNetHours.toFixed(2)),
        totalOvertimeHours: Number(totalOvertimeHours.toFixed(2)),
        totalBreakMinutes,
        lateDays,
        hourlyRate,
        effectiveBaseSalary,
        overtimePay,
        punctualityBonus,
        latenessDeduction,
        grossSalary,
        employeeSocial,
        employerSocial,
        incomeTax,
        netSalary,
      };
    });
  }, [unifiedBadgeHolders, attendanceRecords, countryCode]);

  const syncBiometricPayrollToPayslips = (
    updatedAttendanceList: BiometricAttendanceRecord[],
    silent = false
  ) => {
    const norm = COUNTRY_CDI_PAYROLL_NORMS[countryCode] || COUNTRY_CDI_PAYROLL_NORMS.DEFAULT;
    const currentPeriod = new Date().toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });
    const todayStr = new Date().toISOString().slice(0, 10);

    const generatedPayslips: PayslipRecord[] = unifiedBadgeHolders.map((holder, idx) => {
      const empRecords = updatedAttendanceList.filter(
        (r) => r.employeeMatricule === holder.matricule || r.employeeName === holder.fullName
      );
      const daysPointed = empRecords.length;
      let totalNetHours = 0;
      let totalOvertimeHours = 0;
      let lateDays = 0;

      empRecords.forEach((rec) => {
        const calc = computeNetWorkedAndOvertimeHours({
          checkInTime: rec.checkInTime,
          breakStartTime: rec.breakStartTime,
          breakEndTime: rec.breakEndTime,
          checkOutTime: rec.checkOutTime,
        });
        totalNetHours += rec.netWorkedHours ?? calc.netWorkedHours ?? 8;
        totalOvertimeHours += rec.overtimeHours ?? calc.overtimeHours ?? 0;
        const inMin = parseTimeToMinutes(rec.checkInTime);
        if (inMin !== null && inMin > 8 * 60 + 15) lateDays += 1;
      });

      const hourlyRate = Math.round(holder.baseSalary / (norm.legalHoursMonth || 173.33));
      const overtimePay = Math.round(totalOvertimeHours * hourlyRate * 1.25);
      const punctualityBonus =
        daysPointed > 0 && lateDays === 0 ? Math.round(holder.baseSalary * 0.04) : 0;
      const latenessDeduction = lateDays > 0 ? Math.round(lateDays * hourlyRate * 0.5) : 0;
      const effectiveBaseSalary =
        holder.contractType === 'Temporaire / Journalier'
          ? Math.max(daysPointed, 1) * holder.baseSalary
          : holder.baseSalary;

      const bonuses = overtimePay + punctualityBonus;
      const grossSalary = Math.max(
        0,
        effectiveBaseSalary + holder.transportAllowance + bonuses - latenessDeduction
      );
      const socialContributions = Math.round((grossSalary * norm.employeeSocialPct) / 100);
      const employerSocialContributions = Math.round((grossSalary * norm.employerSocialPct) / 100);
      const incomeTax = Math.round((grossSalary * norm.incomeTaxPct) / 100);
      const netSalary = Math.max(0, grossSalary - socialContributions - incomeTax);

      return {
        id: `pay_bio_${holder.matricule}_${todayStr.slice(0, 7)}`,
        payslipNumber: `BP-BIO-${new Date().getFullYear()}-${String(idx + 1).padStart(3, '0')}`,
        period: `${currentPeriod} (Pointage Biométrique & QR : ${daysPointed}j · ${totalNetHours.toFixed(1)}h nettes)`,
        periodicityLabel: 'Mensuel',
        paymentDate: todayStr,
        paidDate: todayStr,
        employeeId: holder.id,
        employeeMatricule: holder.matricule,
        employeeName: holder.fullName,
        employeeCategory: holder.workerCategory,
        employeePosition: holder.position,
        employeeDepartment: holder.department,
        contractType: holder.contractType,
        remunerationModeLabel: `Calcul Automatique sur Pointage Biométrique & QR Code (${daysPointed} j / ${totalNetHours.toFixed(1)} h nettes / +${totalOvertimeHours.toFixed(1)} h sup.)`,
        projectName: holder.projectName,
        workedDays: daysPointed || 22,
        unitRateOrBase: hourlyRate,
        baseSalary: effectiveBaseSalary,
        overtimeHours: Number(totalOvertimeHours.toFixed(2)),
        overtimePay,
        transportAllowance: holder.transportAllowance,
        performanceBonus: punctualityBonus,
        grossSalary,
        socialContribution: socialContributions,
        employeeSocialContribution: socialContributions,
        employerCharges: employerSocialContributions,
        employerSocialContribution: employerSocialContributions,
        incomeTax,
        incomeTaxWithholding: incomeTax,
        salaryAdvance: latenessDeduction,
        totalDeductions: socialContributions + incomeTax + latenessDeduction,
        netSalary,
        netPayable: netSalary,
        countryNormsLabel: `${norm.label} · Certifié Pointage Biométrique & QR Code`,
        paymentMethod: 'Virement Bancaire / Mobile Money',
        status: 'paid',
      };
    });

    // Merge with existing payslips without losing historical payslips
    const mapById = new Map<string, PayslipRecord>();
    generatedPayslips.forEach((p) => mapById.set(p.id, p));
    payslips.forEach((p) => {
      if (!mapById.has(p.id)) mapById.set(p.id, p);
    });
    const mergedPayslips = Array.from(mapById.values());
    onUpdatePayslips(mergedPayslips);

    if (!silent) {
      onRecordAuditTrace?.(
        'PAIE',
        'CALCUL_AUTOMATIQUE_PAIE_DEPUIS_POINTAGE_BIOMETRIQUE_QR',
        `PAIE-BIO-${todayStr}`,
        `${generatedPayslips.length} bulletin(s) de paie calculés automatiquement à partir des heures d'arrivée, de pause (entrée/sortie) et de départ validées par Pointage Biométrique & QR Code.`
      );
      onTriggerToast?.(
        `Calcul automatique des paies effectué à partir du Pointage Biométrique & QR Code pour ${generatedPayslips.length} collaborateur(s) !`
      );
    }
  };

  // Validate one of the 4 attendance events: check_in, break_start, break_end, check_out
  const handleValidateEvent = async (
    eventType: 'check_in' | 'break_start' | 'break_end' | 'check_out',
    explicitHolder?: (typeof unifiedBadgeHolders)[number]
  ) => {
    let targetHolder = explicitHolder || selectedHolder;

    // If QR code string was scanned/entered, match holder from QR payload
    if (validationMethod === 'qr_code' && qrInputString.trim()) {
      const parts = qrInputString.trim().split('|');
      const scannedMatricule = parts.length >= 4 ? parts[3] : qrInputString.trim();
      const matched = unifiedBadgeHolders.find(
        (h) =>
          h.matricule.toLowerCase() === scannedMatricule.toLowerCase() ||
          h.qrPayload === qrInputString.trim()
      );
      if (matched) {
        targetHolder = matched;
        setSelectedHolderMatricule(matched.matricule);
      }
    }

    if (!targetHolder) {
      onTriggerToast?.(
        'Veuillez sélectionner un collaborateur ou scanner un badge QR Code valide.'
      );
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const nowTime =
      customTimeOverride.trim() && /^\d{2}:\d{2}/.test(customTimeOverride.trim())
        ? `${customTimeOverride.trim().slice(0, 5)}:00`
        : new Date().toTimeString().slice(0, 8);

    const existingTodayIdx = attendanceRecords.findIndex(
      (r) => r.employeeMatricule === targetHolder!.matricule && r.date === today
    );

    const methodPrefix =
      validationMethod === 'qr_code'
        ? 'QR-BADGE-ISO'
        : validationMethod === 'fingerprint'
          ? 'BIO-FP-SHA256'
          : 'BIO-FACE-3D';
    const bioHash = `${methodPrefix}-${targetHolder.matricule}-${Date.now().toString(36).toUpperCase()}`;

    let updatedList: BiometricAttendanceRecord[] = [];
    let eventLabel = '';

    if (eventType === 'check_in') {
      eventLabel = 'ARRIVÉE (Check-In)';
      const inMin = parseTimeToMinutes(nowTime);
      const isLate = inMin !== null && inMin > 8 * 60 + 15;
      const newRec: BiometricAttendanceRecord = {
        id: existingTodayIdx >= 0 ? attendanceRecords[existingTodayIdx].id : `att_${Date.now()}`,
        date: today,
        checkInTime: nowTime,
        breakStartTime:
          existingTodayIdx >= 0 ? attendanceRecords[existingTodayIdx].breakStartTime : undefined,
        breakEndTime:
          existingTodayIdx >= 0 ? attendanceRecords[existingTodayIdx].breakEndTime : undefined,
        checkOutTime:
          existingTodayIdx >= 0 ? attendanceRecords[existingTodayIdx].checkOutTime : undefined,
        employeeMatricule: targetHolder.matricule,
        employeeName: targetHolder.fullName,
        contractType: targetHolder.contractType,
        position: targetHolder.position,
        projectName: targetHolder.projectName,
        validationMethod,
        biometricHash: bioHash,
        qrBadgePayload: targetHolder.qrPayload,
        confidenceScore: validationMethod === 'qr_code' ? 100 : 99.8,
        status: isLate ? 'late' : 'present',
      };
      if (existingTodayIdx >= 0) {
        updatedList = attendanceRecords.map((r, i) => (i === existingTodayIdx ? newRec : r));
      } else {
        updatedList = [newRec, ...attendanceRecords];
      }
    } else if (eventType === 'break_start') {
      eventLabel = 'ENTRÉE EN PAUSE (Début Pause)';
      if (existingTodayIdx >= 0) {
        updatedList = attendanceRecords.map((r, i) =>
          i === existingTodayIdx
            ? {
                ...r,
                breakStartTime: nowTime,
                validationMethod,
                qrBadgePayload: targetHolder!.qrPayload,
                status: 'on_break',
              }
            : r
        );
      } else {
        updatedList = [
          {
            id: `att_${Date.now()}`,
            date: today,
            checkInTime: '08:00:00',
            breakStartTime: nowTime,
            employeeMatricule: targetHolder.matricule,
            employeeName: targetHolder.fullName,
            contractType: targetHolder.contractType,
            position: targetHolder.position,
            projectName: targetHolder.projectName,
            validationMethod,
            biometricHash: bioHash,
            qrBadgePayload: targetHolder.qrPayload,
            confidenceScore: 100,
            status: 'on_break',
          },
          ...attendanceRecords,
        ];
      }
    } else if (eventType === 'break_end') {
      eventLabel = 'SORTIE DE PAUSE (Reprise Service)';
      if (existingTodayIdx >= 0) {
        const current = attendanceRecords[existingTodayIdx];
        const bStart = current.breakStartTime || '12:00:00';
        const calc = computeNetWorkedAndOvertimeHours({
          checkInTime: current.checkInTime,
          breakStartTime: bStart,
          breakEndTime: nowTime,
          checkOutTime: current.checkOutTime,
        });
        updatedList = attendanceRecords.map((r, i) =>
          i === existingTodayIdx
            ? {
                ...r,
                breakStartTime: bStart,
                breakEndTime: nowTime,
                breakDurationMinutes: calc.breakDurationMinutes,
                validationMethod,
                qrBadgePayload: targetHolder!.qrPayload,
                status: 'present',
              }
            : r
        );
      } else {
        updatedList = [
          {
            id: `att_${Date.now()}`,
            date: today,
            checkInTime: '08:00:00',
            breakStartTime: '12:00:00',
            breakEndTime: nowTime,
            breakDurationMinutes: Math.max(
              0,
              (parseTimeToMinutes(nowTime) || 780) - 720
            ),
            employeeMatricule: targetHolder.matricule,
            employeeName: targetHolder.fullName,
            contractType: targetHolder.contractType,
            position: targetHolder.position,
            projectName: targetHolder.projectName,
            validationMethod,
            biometricHash: bioHash,
            qrBadgePayload: targetHolder.qrPayload,
            confidenceScore: 100,
            status: 'present',
          },
          ...attendanceRecords,
        ];
      }
    } else {
      eventLabel = 'DÉPART (Check-Out & Clôture Journée)';
      const current = existingTodayIdx >= 0 ? attendanceRecords[existingTodayIdx] : null;
      const checkIn = current?.checkInTime || '08:00:00';
      const bStart = current?.breakStartTime || '12:00:00';
      const bEnd = current?.breakEndTime || '13:00:00';
      const calc = computeNetWorkedAndOvertimeHours({
        checkInTime: checkIn,
        breakStartTime: bStart,
        breakEndTime: bEnd,
        checkOutTime: nowTime,
      });

      const completedRec: BiometricAttendanceRecord = {
        id: current?.id || `att_${Date.now()}`,
        date: today,
        checkInTime: checkIn,
        breakStartTime: bStart,
        breakEndTime: bEnd,
        breakDurationMinutes: calc.breakDurationMinutes,
        checkOutTime: nowTime,
        netWorkedHours: calc.netWorkedHours,
        overtimeHours: calc.overtimeHours,
        employeeMatricule: targetHolder.matricule,
        employeeName: targetHolder.fullName,
        contractType: targetHolder.contractType,
        position: targetHolder.position,
        projectName: targetHolder.projectName,
        validationMethod,
        biometricHash: bioHash,
        qrBadgePayload: targetHolder.qrPayload,
        confidenceScore: validationMethod === 'qr_code' ? 100 : 99.8,
        status: 'completed',
      };

      if (existingTodayIdx >= 0) {
        updatedList = attendanceRecords.map((r, i) =>
          i === existingTodayIdx ? completedRec : r
        );
      } else {
        updatedList = [completedRec, ...attendanceRecords];
      }
    }

    onUpdateAttendanceRecords(updatedList);

    try {
      await fetch('/api/saas/biometric-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, records: updatedList }),
      });
    } catch {
      // ignore
    }

    // Automatically recalculate payroll whenever attendance changes
    syncBiometricPayrollToPayslips(updatedList, true);

    onRecordAuditTrace?.(
      'RH_EMPLOYE',
      `POINTAGE_${eventType.toUpperCase()}_${validationMethod.toUpperCase()}`,
      targetHolder.matricule,
      `${eventLabel} validé à ${nowTime} pour ${targetHolder.fullName} (${targetHolder.matricule}) par ${
        validationMethod === 'qr_code'
          ? 'QR Code Badge'
          : validationMethod === 'fingerprint'
            ? 'Empreinte Digitale'
            : 'Reconnaissance Faciale'
      } — Paie synchronisée automatiquement.`
    );

    onTriggerToast?.(
      `${eventLabel} validé à ${nowTime} pour ${targetHolder.fullName} (${targetHolder.matricule}) via ${
        validationMethod === 'qr_code'
          ? 'QR Code Badge'
          : validationMethod === 'fingerprint'
            ? 'Empreinte Digitale'
            : 'Visage 3D'
      }. Calcul de paie mis à jour !`
    );
  };

  const handlePrintBadgeWithQrA4 = (holder: (typeof unifiedBadgeHolders)[number]) => {
    const bodyHtml = `
      <div style="display: flex; justify-content: center; padding: 16px 0;">
        <div style="width: 360px; border: 2px solid ${letterhead.primaryColor || '#0a2558'}; border-radius: 16px; overflow: hidden; background: #ffffff; box-shadow: 0 8px 24px rgba(15,23,42,0.12);">
          <div style="background: ${letterhead.primaryColor || '#0a2558'}; color: #ffffff; padding: 14px 16px; text-align: center;">
            <div style="font-size: 13px; font-weight: 800; text-transform: uppercase;">${companyName}</div>
            <div style="font-size: 10px; opacity: 0.9; margin-top: 2px;">BADGE PROFESSIONNEL D'IDENTIFICATION &amp; POINTAGE QR</div>
            <div style="font-size: 11px; font-weight: 800; color: #fbbf24; margin-top: 4px;">MATRICULE : ${holder.matricule}</div>
          </div>
          <div style="padding: 16px; text-align: center;">
            <div style="font-size: 15px; font-weight: 800; color: #0f172a; text-transform: uppercase;">${holder.fullName}</div>
            <div style="font-size: 11px; font-weight: 700; color: #1d4ed8; margin-top: 2px;">${holder.position} · ${holder.department}</div>
            <div style="font-size: 10.5px; color: #475569; margin-top: 8px; text-align: left; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div><strong>Catégorie :</strong> ${holder.holderCategory === 'personnel_rh' ? 'Personnel RH' : 'Collaborateur Entreprise'} (${holder.contractType})</div>
              <div><strong>Projet / Affectation :</strong> ${holder.projectName}</div>
              <div><strong>Téléphone :</strong> ${holder.phone}</div>
              <div><strong>E-mail :</strong> ${holder.email}</div>
              <div><strong>Groupe Sanguin :</strong> ${holder.bloodGroup}</div>
            </div>
            <div style="margin-top: 12px; padding: 10px; border: 1px dashed #94a3b8; border-radius: 10px; background: #f8fafc;">
              <div style="font-size: 10px; font-weight: 800; color: #0f172a;">JETON QR CODE BIOMÉTRIQUE CERTIFIÉ</div>
              <div style="font-family: monospace; font-size: 9.5px; color: #1e293b; word-break: break-all; margin-top: 4px;">${holder.qrPayload}</div>
              <div style="font-size: 9px; color: #047857; font-weight: 700; margin-top: 4px;">
                VALIDE POUR : ARRIVÉE · PAUSE (ENTRÉE / SORTIE) · DÉPART · PAIE AUTOMATIQUE
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    printOfficialDocumentWithLetterhead({
      letterhead,
      documentTitle: `BADGE PROFESSIONNEL QR CODE — ${holder.fullName}`,
      documentReference: `BADGE-QR-${holder.matricule}`,
      bodyHtml,
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <QrCode className="w-4 h-4 text-blue-600" />
            <span>Identification Biométrique, Badges QR Code &amp; Paie Automatisée</span>
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
            Centre Intelligent de Pointage Biométrique, Badges QR Code &amp; Paie ({companyName})
          </h2>
          <p className="text-xs text-slate-500">
            Validation temps réel par QR Code du badge (Personnel &amp; Collaborateurs), Empreinte Digitale ou Visage pour l&apos;Arrivée, l&apos;Entrée en pause, la Sortie de pause et le Départ, avec prise en charge automatique pour le calcul des paies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setActiveSubView('terminal_and_qr')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeSubView === 'terminal_and_qr'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Terminal QR &amp; Biométrie (Arrivée / Pause / Départ)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubView('badges_gallery')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeSubView === 'badges_gallery'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <IdCard className="w-3.5 h-3.5" />
            <span>Badges QR Code Personnel &amp; Collaborateurs ({unifiedBadgeHolders.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubView('biometric_payroll')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeSubView === 'biometric_payroll'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Calcul Automatique des Paies (Biométrie &amp; QR)</span>
          </button>
        </div>
      </div>

      {/* SOUS-VUE 1 : TERMINAL INTELLIGENT DE POINTAGE (ARRIVÉE, PAUSE ENTRÉE/SORTIE, DÉPART) */}
      {activeSubView === 'terminal_and_qr' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Lecteur Optique QR Code &amp; Capteur Biométrique
              </h3>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                Synchronisé Paie RH
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Personnel ou Collaborateur à pointer
                </label>
                <select
                  value={selectedHolderMatricule}
                  onChange={(e) => {
                    const mat = e.target.value;
                    setSelectedHolderMatricule(mat);
                    const found = unifiedBadgeHolders.find((h) => h.matricule === mat);
                    if (found) setQrInputString(found.qrPayload);
                  }}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-semibold"
                >
                  {unifiedBadgeHolders.map((h) => (
                    <option key={h.matricule} value={h.matricule}>
                      [{h.matricule}] {h.fullName} — {h.position} (
                      {h.holderCategory === 'personnel_rh' ? 'Personnel RH' : 'Collaborateur'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setValidationMethod('qr_code')}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer ${
                    validationMethod === 'qr_code'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR Code Badge</span>
                </button>
                <button
                  type="button"
                  onClick={() => setValidationMethod('fingerprint')}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer ${
                    validationMethod === 'fingerprint'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  <Fingerprint className="w-3.5 h-3.5" />
                  <span>Empreinte</span>
                </button>
                <button
                  type="button"
                  onClick={() => setValidationMethod('face')}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer ${
                    validationMethod === 'face'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  <ScanFace className="w-3.5 h-3.5" />
                  <span>Visage 3D</span>
                </button>
              </div>

              {selectedHolder && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex items-center gap-3.5">
                  <div className="p-2 rounded-lg bg-white border border-slate-200 shrink-0">
                    <QRCodeSVG
                      value={selectedHolder.qrPayload}
                      size={74}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="font-extrabold text-slate-900 dark:text-white truncate uppercase">
                      {selectedHolder.fullName}
                    </div>
                    <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
                      {selectedHolder.matricule} · {selectedHolder.position}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      Projet : {selectedHolder.projectName}
                    </div>
                    <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 truncate">
                      QR Actif : Arrivée · Pause (Entrée/Sortie) · Départ
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Jeton QR Code scanné (Douchette optique / Caméra)
                  </label>
                  <input
                    type="text"
                    value={qrInputString}
                    onChange={(e) => setQrInputString(e.target.value)}
                    placeholder="MEP-QR-BIO|v2|..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-[11px] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Heure (Optionnel)
                  </label>
                  <input
                    type="time"
                    value={customTimeOverride}
                    onChange={(e) => setCustomTimeOverride(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>

              {/* LES 4 BOUTONS OFFICIELS DE VALIDATION DU POINTAGE (ARRIVÉE, PAUSE ENTRÉE, PAUSE SORTIE, DÉPART) */}
              <div className="pt-1">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Valider le Pointage par {validationMethod === 'qr_code' ? 'Scan QR Code Badge' : validationMethod === 'fingerprint' ? 'Empreinte Digitale' : 'Reconnaissance Faciale'} :
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleValidateEvent('check_in')}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>1. Arrivée (Matin)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleValidateEvent('break_start')}
                    className="py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Coffee className="w-4 h-4" />
                    <span>2. Pause (Entrée)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleValidateEvent('break_end')}
                    className="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Clock className="w-4 h-4" />
                    <span>3. Pause (Sortie)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleValidateEvent('check_out')}
                    className="py-2.5 px-3 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>4. Départ (Clôture)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* TABLEAU TEMPS RÉEL DES POINTAGES AVEC PAUSES, HEURES NETTES & SYNCHRO PAIE */}
          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Journal Détaillé des Pointages (Arrivée · Pause Entrée/Sortie · Départ · Heures Nettes)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Chaque pointage calcule automatiquement les heures nettes travaillées (hors pause) et alimente la paie.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => syncBiometricPayrollToPayslips(attendanceRecords, false)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Recalculer toutes les Paies</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 bg-slate-50/70 dark:bg-slate-950/50">
                      <th className="py-2.5 px-3">Date &amp; Collaborateur</th>
                      <th className="py-2.5 px-3">Arrivée</th>
                      <th className="py-2.5 px-3">Pause (Entrée → Sortie)</th>
                      <th className="py-2.5 px-3">Départ</th>
                      <th className="py-2.5 px-3 text-right">Heures Nettes &amp; Sup.</th>
                      <th className="py-2.5 px-3">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {attendanceRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          Aucun pointage enregistré aujourd&apos;hui. Utilisez les boutons Arrivée, Pause (Entrée/Sortie) ou Départ ci-contre.
                        </td>
                      </tr>
                    ) : (
                      attendanceRecords.slice(0, 15).map((rec) => {
                        const calc = computeNetWorkedAndOvertimeHours({
                          checkInTime: rec.checkInTime,
                          breakStartTime: rec.breakStartTime,
                          breakEndTime: rec.breakEndTime,
                          checkOutTime: rec.checkOutTime,
                        });
                        const netH = rec.netWorkedHours ?? calc.netWorkedHours;
                        const overH = rec.overtimeHours ?? calc.overtimeHours;
                        const brkMin = rec.breakDurationMinutes ?? calc.breakDurationMinutes;
                        return (
                          <tr
                            key={rec.id}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                          >
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900 dark:text-white uppercase">
                                {rec.employeeName}
                              </div>
                              <div className="text-[11px] font-mono text-slate-500">
                                {rec.date} · {rec.employeeMatricule}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {rec.checkInTime || '—'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] tabular-nums">
                              {rec.breakStartTime ? (
                                <div>
                                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                    {rec.breakStartTime}
                                  </span>
                                  <span> → </span>
                                  <span className="text-sky-600 dark:text-sky-400 font-semibold">
                                    {rec.breakEndTime || 'En pause...'}
                                  </span>
                                  {brkMin > 0 && (
                                    <span className="block text-[10px] text-slate-500">
                                      ({brkMin} min déduites)
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">Aucune pause</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                              {rec.checkOutTime || 'En service'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {netH > 0 ? `${netH} h` : 'En cours'}
                              </div>
                              {overH > 0 && (
                                <div className="text-[10px] text-emerald-600 font-bold">
                                  +{overH} h sup.
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                {rec.validationMethod === 'qr_code'
                                  ? 'QR Code Badge'
                                  : rec.validationMethod === 'fingerprint'
                                    ? 'Empreinte'
                                    : 'Visage 3D'}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
                                {rec.confidenceScore}% certifié
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SOUS-VUE 2 : GALERIE DES BADGES PROFESSIONNELS AVEC QR CODE (PERSONNEL & COLLABORATEURS) */}
      {activeSubView === 'badges_gallery' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Chaque badge professionnel intègre un <strong>QR Code cryptographique individuel</strong> permettant de valider directement l&apos;Arrivée, la Pause (Entrée/Sortie) et le Départ sur la borne biométrique.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {unifiedBadgeHolders.map((holder) => (
              <div
                key={holder.matricule}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 p-4 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-slate-500">
                      <span>
                        {holder.holderCategory === 'personnel_rh'
                          ? 'Badge Personnel RH'
                          : 'Badge Collaborateur'}
                      </span>
                      <span aria-hidden="true"> · </span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {holder.matricule}
                      </span>
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase truncate mt-0.5">
                      {holder.fullName}
                    </h4>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {holder.position} · {holder.department}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Projet : {holder.projectName} · Contrat : {holder.contractType}
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-xs shrink-0 text-center">
                    <QRCodeSVG
                      value={holder.qrPayload}
                      size={80}
                      level="M"
                      includeMargin={false}
                    />
                    <div className="text-[9px] font-mono font-bold text-slate-700 mt-1">
                      SCAN POINTAGE
                    </div>
                  </div>
                </div>

                {/* Actions rapides de pointage par scan direct du QR Code du badge + impression PDF */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">
                    Pointer immédiatement avec ce Badge QR Code :
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setValidationMethod('qr_code');
                        setSelectedHolderMatricule(holder.matricule);
                        setQrInputString(holder.qrPayload);
                        void handleValidateEvent('check_in', holder);
                      }}
                      className="py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                    >
                      Arrivée
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setValidationMethod('qr_code');
                        setSelectedHolderMatricule(holder.matricule);
                        setQrInputString(holder.qrPayload);
                        void handleValidateEvent('break_start', holder);
                      }}
                      className="py-1.5 px-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold cursor-pointer"
                    >
                      Pause In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setValidationMethod('qr_code');
                        setSelectedHolderMatricule(holder.matricule);
                        setQrInputString(holder.qrPayload);
                        void handleValidateEvent('break_end', holder);
                      }}
                      className="py-1.5 px-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold cursor-pointer"
                    >
                      Pause Out
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setValidationMethod('qr_code');
                        setSelectedHolderMatricule(holder.matricule);
                        setQrInputString(holder.qrPayload);
                        void handleValidateEvent('check_out', holder);
                      }}
                      className="py-1.5 px-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-[11px] font-bold cursor-pointer"
                    >
                      Départ
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        exportEmployeeBadgeToPDF(
                          {
                            matricule: holder.matricule,
                            fullName: holder.fullName,
                            workerCategory: holder.workerCategory,
                            position: holder.position,
                            department: holder.department,
                            contractType: holder.contractType,
                            assignedProjectName: holder.projectName,
                            phone: holder.phone,
                            email: holder.email,
                            nationalIdNumber: holder.nationalIdNumber,
                            emergencyContact: holder.phone,
                            bloodGroup: holder.bloodGroup,
                            hireDate: holder.hireDate,
                            photoDataUrl: holder.photoDataUrl,
                          },
                          companyName,
                          companyLogo,
                          docCustomization
                        )
                      }
                      className="flex-1 py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-100"
                    >
                      <FileDown className="w-3.5 h-3.5 text-blue-600" />
                      <span>Badge PDF (QR ISO CR80)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintBadgeWithQrA4(holder)}
                      className="py-1.5 px-2.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimer</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SOUS-VUE 3 : PRISE EN CHARGE AUTOMATIQUE DU POINTAGE BIOMÉTRIQUE POUR LE CALCUL DES PAIES */}
      {activeSubView === 'biometric_payroll' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Moteur de Calcul Automatique des Paies basé sur le Pointage Biométrique &amp; QR Code
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Les heures d&apos;arrivée, de pause (entrée/sortie) et de départ pointées déterminent automatiquement les heures nettes travaillées, les heures supplémentaires (+25%), la prime d&apos;assiduité et le Salaire Net à Payer.
              </p>
            </div>
            <button
              type="button"
              onClick={() => syncBiometricPayrollToPayslips(attendanceRecords, false)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-xs"
            >
              <Calculator className="w-4 h-4" />
              <span>Générer &amp; Synchroniser tous les Bulletins de Paie</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 bg-slate-50/70 dark:bg-slate-950/50">
                  <th className="py-2.5 px-3">Collaborateur / Matricule</th>
                  <th className="py-2.5 px-3 text-right">Jours &amp; Heures Nettes</th>
                  <th className="py-2.5 px-3 text-right">Pause Déduite</th>
                  <th className="py-2.5 px-3 text-right">Salaire Base + Transport</th>
                  <th className="py-2.5 px-3 text-right">Heures Sup. &amp; Assiduité</th>
                  <th className="py-2.5 px-3 text-right">Charges &amp; Impôts</th>
                  <th className="py-2.5 px-3 text-right">Net à Payer Certifié</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {biometricPayrollSummary.map((row) => (
                  <tr
                    key={row.holder.matricule}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 dark:text-white uppercase">
                        {row.holder.fullName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {row.holder.matricule} · {row.holder.position}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {row.daysPointed} j · {row.totalNetHours} h
                      </div>
                      {row.totalOvertimeHours > 0 && (
                        <div className="text-[10px] text-emerald-600 font-bold">
                          dont +{row.totalOvertimeHours} h sup.
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-600 dark:text-amber-400">
                      {row.totalBreakMinutes} min
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {formatCurrency(
                        row.effectiveBaseSalary + row.holder.transportAllowance,
                        currency
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
                      +{formatCurrency(row.overtimePay + row.punctualityBonus, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400">
                      -{formatCurrency(row.employeeSocial + row.incomeTax, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-extrabold text-slate-900 dark:text-white">
                      {formatCurrency(row.netSalary, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 4. MESSAGERIE INSTANTANÉE INTERNE PROPULSÉE PAR TWILIO CONVERSATIONS API
//    AVEC RELAIS TEMPS RÉEL WHATSAPP, SMS ET E-MAIL
// ============================================================================

export interface TwilioInternalChatMessage {
  id: string;
  messageSid: string;
  conversationSid: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  recipientName?: string;
  body: string;
  attachmentLabel?: string;
  deliveryStatus: 'delivered' | 'read';
  relayedChannels: string[];
  relayedReceipts?: string[];
  createdAt: string;
}

export interface TwilioInternalChatChannel {
  id: string;
  conversationSid: string;
  serviceSid: string;
  name: string;
  topic: string;
  department: string;
  participantsCount: number;
  unreadCount: number;
  updatedAt: string;
  messages: TwilioInternalChatMessage[];
}

export const TwilioInternalInstantMessenger: React.FC<{
  tenantId: string;
  companyName: string;
  currentUserName: string;
  currentUserRole: string;
  collaborators: LocalAccountRecord[];
  employees: EmployeeRecord[];
  onTriggerToast?: (msg: string) => void;
}> = ({
  tenantId,
  companyName,
  currentUserName,
  currentUserRole,
  collaborators,
  employees,
  onTriggerToast,
}) => {
  const [channels, setChannels] = useState<TwilioInternalChatChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('chan-general');
  const [serviceSid, setServiceSid] = useState<string>('IS9041a8b2c4d6e8f0123456789abcdef0');
  const [messageInput, setMessageInput] = useState<string>('');
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('all');
  const [relayWhatsApp, setRelayWhatsApp] = useState<boolean>(false);
  const [relaySms, setRelaySms] = useState<boolean>(false);
  const [relayEmail, setRelayEmail] = useState<boolean>(false);
  const [openExternalChannelOnSend, setOpenExternalChannelOnSend] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  const directoryRecipients = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      role: string;
      phone: string;
      email: string;
    }> = [];
    collaborators.forEach((c) => {
      list.push({
        id: c.id,
        name: c.fullName,
        role: c.functionTitle || c.role,
        phone: `${c.phoneDialCode || '+225'}${c.phoneNumber || ''}`,
        email: c.email,
      });
    });
    employees.forEach((e) => {
      if (!list.some((x) => x.name === e.fullName)) {
        list.push({
          id: e.id,
          name: e.fullName,
          role: e.position,
          phone: e.phone,
          email: e.email,
        });
      }
    });
    return list;
  }, [collaborators, employees]);

  const loadChannels = async () => {
    try {
      const res = await fetch(
        `/api/twilio/internal-chat/channels?tenantId=${encodeURIComponent(
          tenantId || 'default_tenant'
        )}&companyName=${encodeURIComponent(companyName)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && Array.isArray(data.channels)) {
          setChannels(data.channels);
          if (data.twilioConversationsServiceSid) {
            setServiceSid(data.twilioConversationsServiceSid);
          }
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadChannels();
    let es: EventSource | null = null;
    try {
      if (typeof EventSource !== 'undefined') {
        es = new EventSource('/api/messaging/stream');
        es.addEventListener('twilio_internal_chat_message', (ev: MessageEvent) => {
          try {
            const payload = JSON.parse(ev.data);
            if (
              payload &&
              (!payload.tenantId || payload.tenantId === tenantId) &&
              Array.isArray(payload.channels)
            ) {
              setChannels(payload.channels);
            }
          } catch {
            // ignore
          }
        });
      }
    } catch {
      // ignore
    }
    return () => {
      try {
        es?.close();
      } catch {
        // ignore
      }
    };
  }, [tenantId, companyName]);

  const activeChannel = useMemo(
    () => channels.find((c) => c.id === selectedChannelId) || channels[0] || null,
    [channels, selectedChannelId]
  );

  const selectedRecipient = useMemo(
    () => directoryRecipients.find((r) => r.id === selectedRecipientId) || null,
    [directoryRecipients, selectedRecipientId]
  );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChannel) return;

    setIsSending(true);
    try {
      const relayChannels: Array<'whatsapp' | 'sms' | 'email'> = [];
      if (relayWhatsApp) relayChannels.push('whatsapp');
      if (relaySms) relayChannels.push('sms');
      if (relayEmail) relayChannels.push('email');

      const res = await fetch('/api/twilio/internal-chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          companyName,
          channelId: activeChannel.id,
          senderName: currentUserName || 'Super-Admin',
          senderRole: currentUserRole || 'Direction Générale',
          body: messageInput.trim(),
          relayChannels,
          recipientName: selectedRecipient?.name || 'Équipe Interne',
          recipientPhone: selectedRecipient?.phone || '+2250700000000',
          recipientEmail: selectedRecipient?.email || 'equipe@entreprise.com',
        }),
      });

      const data = await res.json();
      if (data?.ok && Array.isArray(data.channels)) {
        setChannels(data.channels);
      }

      if (openExternalChannelOnSend && relayChannels.length > 0) {
        triggerOptionalExternalChannelApp({
          channel: relayChannels[0],
          recipientPhone: selectedRecipient?.phone || '',
          recipientEmail: selectedRecipient?.email || '',
          subject: `[${companyName} · ${activeChannel.name}] Message interne de ${currentUserName}`,
          body: messageInput.trim(),
        });
      }

      const cleanText = messageInput.trim();
      setMessageInput('');
      onTriggerToast?.(
        `Message interne envoyé sur ${activeChannel.name} via Twilio Conversations${
          relayChannels.length > 0 ? ` + relais réel (${relayChannels.join(', ').toUpperCase()})` : ''
        } : « ${cleanText.slice(0, 45)} »`
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-950/60">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <MessageSquare className="w-4 h-4 text-rose-600" />
            <span>Twilio Conversations API · Service SID :</span>
            <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
              {serviceSid}
            </span>
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
            Messagerie Instantanée Interne propulsée par Twilio ({companyName})
          </h3>
          <p className="text-xs text-slate-500">
            Communication interne temps réel entre collaborateurs et services avec relais simultané par WhatsApp Business, SMS E.164 et E-mail SendGrid/SMTP.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedRecipientId}
            onChange={(e) => setSelectedRecipientId(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold"
          >
            <option value="all">Destinataire : Toute l&apos;équipe du canal</option>
            {directoryRecipients.map((r) => (
              <option key={r.id} value={r.id}>
                @{r.name} ({r.role}) — {r.phone || r.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[420px]">
        {/* Liste des canaux internes Twilio Conversations */}
        <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-3 space-y-2 bg-slate-50/40 dark:bg-slate-950/30">
          <div className="text-[11px] font-bold text-slate-500 px-2 py-1">
            Canaux d&apos;Entreprise Twilio ({channels.length})
          </div>
          {channels.map((chan) => {
            const isActive = chan.id === activeChannel?.id;
            return (
              <button
                key={chan.id}
                type="button"
                onClick={() => setSelectedChannelId(chan.id)}
                className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                  isActive
                    ? 'border-blue-600 bg-blue-50/90 dark:bg-blue-950/40 text-slate-900 dark:text-white'
                    : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {chan.name}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500 tabular-nums">
                    {chan.messages.length} msg
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{chan.topic}</p>
                <div className="text-[10px] font-mono text-slate-400 mt-1 truncate">
                  SID : {chan.conversationSid.slice(0, 18)}...
                </div>
              </button>
            );
          })}
        </div>

        {/* Fil de discussion temps réel + compositeur multi-relais Twilio */}
        <div className="lg:col-span-8 flex flex-col justify-between p-4 space-y-4">
          {activeChannel ? (
            <>
              <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
                {activeChannel.messages.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Aucun message dans {activeChannel.name}. Lancez la discussion interne ci-dessous.
                  </div>
                ) : (
                  activeChannel.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 p-3 space-y-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div>
                          <strong className="text-slate-900 dark:text-white">
                            {msg.senderName}
                          </strong>{' '}
                          <span className="text-slate-500">({msg.senderRole})</span>
                          {msg.recipientName && msg.recipientName !== 'Équipe Interne' && (
                            <span className="text-blue-600 dark:text-blue-400 font-semibold">
                              {' '}
                              → @{msg.recipientName}
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[10px] text-slate-500 tabular-nums">
                          {new Date(msg.createdAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}{' '}
                          · {msg.messageSid.slice(0, 12)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line">
                        {msg.body}
                      </p>
                      {Array.isArray(msg.relayedReceipts) && msg.relayedReceipts.length > 0 && (
                        <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 pt-1">
                          Relais Externe Certifié : {msg.relayedReceipts.join(' · ')}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendMessage} className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-bold text-slate-600 dark:text-slate-300">
                    Relayer aussi en temps réel par :
                  </span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={relayWhatsApp}
                      onChange={(e) => setRelayWhatsApp(e.target.checked)}
                    />
                    <span>WhatsApp Business</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={relaySms}
                      onChange={(e) => setRelaySms(e.target.checked)}
                    />
                    <span>SMS Direct (Twilio)</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={relayEmail}
                      onChange={(e) => setRelayEmail(e.target.checked)}
                    />
                    <span>E-mail (SendGrid/SMTP)</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-blue-600 dark:text-blue-400 font-semibold">
                    <input
                      type="checkbox"
                      checked={openExternalChannelOnSend}
                      onChange={(e) => setOpenExternalChannelOnSend(e.target.checked)}
                    />
                    <span>Ouvrir aussi l&apos;application native (WhatsApp/SMS/Mail)</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder={`Écrire un message instantané dans ${activeChannel.name}...`}
                    className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !messageInput.trim()}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Envoyer (Twilio Live)</span>
                  </button>
                </div>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 5. PANNEAU DE SYNTHÈSE DU TABLEAU DE BORD : TOP 5 CLIENTS PAR VALEUR TOTALE
//    DE PROJET (AVEC VENTILATION MONTANTS PAYÉS VS IMPAYÉS)
// ============================================================================

export interface TopClientProjectSummaryInput {
  id: string;
  name: string;
  clientName: string;
  budget: number;
  billedAmount: number;
  paidAmount?: number;
  status: string;
}

export interface TopClientDocumentSummaryInput {
  id: string;
  projectId?: string;
  clientName: string;
  docType: string;
  status: string;
  totalAmount: number;
  paidAmount?: number;
}

export const Top5ClientsByProjectValuePanel: React.FC<{
  projects: TopClientProjectSummaryInput[];
  documents: TopClientDocumentSummaryInput[];
  currency: Currency;
  selectedClientFilter?: string;
  onSelectClientFilter?: (clientName: string) => void;
  onOpenDossiersForClient?: (clientName: string) => void;
}> = ({
  projects,
  documents,
  currency,
  selectedClientFilter = 'all',
  onSelectClientFilter,
  onOpenDossiersForClient,
}) => {
  const analytics = useMemo(() => {
    const clientMap = new Map<
      string,
      {
        clientKey: string;
        clientName: string;
        projectsCount: number;
        projectNames: string[];
        totalProjectBudget: number;
        totalBilledOnProjects: number;
        totalProjectDirectPaid: number;
        invoicedTotal: number;
        invoicedPaid: number;
      }
    >();

    projects.forEach((p) => {
      const rawName = (p.clientName || 'Client Non Spécifié').trim() || 'Client Non Spécifié';
      const key = rawName.toLowerCase();
      const existing = clientMap.get(key) || {
        clientKey: key,
        clientName: rawName,
        projectsCount: 0,
        projectNames: [],
        totalProjectBudget: 0,
        totalBilledOnProjects: 0,
        totalProjectDirectPaid: 0,
        invoicedTotal: 0,
        invoicedPaid: 0,
      };
      existing.projectsCount += 1;
      if (p.name && !existing.projectNames.includes(p.name)) {
        existing.projectNames.push(p.name);
      }
      existing.totalProjectBudget += Math.max(0, Number(p.budget) || 0);
      existing.totalBilledOnProjects += Math.max(0, Number(p.billedAmount) || 0);
      existing.totalProjectDirectPaid += Math.max(0, Number(p.paidAmount) || 0);
      clientMap.set(key, existing);
    });

    documents.forEach((d) => {
      if (d.status === 'cancelled' || d.status === 'draft') return;
      const rawName = (d.clientName || '').trim();
      if (!rawName) return;
      const key = rawName.toLowerCase();
      const existing = clientMap.get(key) || {
        clientKey: key,
        clientName: rawName,
        projectsCount: 0,
        projectNames: [],
        totalProjectBudget: 0,
        totalBilledOnProjects: 0,
        totalProjectDirectPaid: 0,
        invoicedTotal: 0,
        invoicedPaid: 0,
      };
      if (d.docType === 'invoice') {
        const docTotal = Math.max(0, Number(d.totalAmount) || 0);
        const docPaid =
          d.status === 'paid'
            ? docTotal
            : Math.min(docTotal, Math.max(0, Number(d.paidAmount) || 0));
        existing.invoicedTotal += docTotal;
        existing.invoicedPaid += docPaid;
      }
      clientMap.set(key, existing);
    });

    const rows = Array.from(clientMap.values())
      .map((item) => {
        const totalProjectValue = Math.max(
          item.totalProjectBudget,
          item.totalBilledOnProjects,
          item.invoicedTotal
        );
        const rawPaid = Math.max(item.invoicedPaid, item.totalProjectDirectPaid);
        const paidAmount = Math.min(totalProjectValue, rawPaid);
        const unpaidAmount = Math.max(0, totalProjectValue - paidAmount);
        const paidPct =
          totalProjectValue > 0 ? Math.min(100, Math.round((paidAmount / totalProjectValue) * 100)) : 0;
        const unpaidPct = Math.max(0, 100 - paidPct);

        return {
          clientName: item.clientName,
          shortClientName:
            item.clientName.length > 18 ? `${item.clientName.slice(0, 16)}…` : item.clientName,
          projectsCount: item.projectsCount,
          projectNames: item.projectNames,
          totalProjectValue,
          paidAmount,
          unpaidAmount,
          paidPct,
          unpaidPct,
        };
      })
      .filter((r) => r.totalProjectValue > 0 || r.projectsCount > 0)
      .sort((a, b) => b.totalProjectValue - a.totalProjectValue)
      .slice(0, 5);

    const grandTotalValue = rows.reduce((s, r) => s + r.totalProjectValue, 0);
    const grandTotalPaid = rows.reduce((s, r) => s + r.paidAmount, 0);
    const grandTotalUnpaid = rows.reduce((s, r) => s + r.unpaidAmount, 0);
    const grandPaidPct =
      grandTotalValue > 0 ? Math.round((grandTotalPaid / grandTotalValue) * 100) : 0;

    return {
      rows,
      grandTotalValue,
      grandTotalPaid,
      grandTotalUnpaid,
      grandPaidPct,
    };
  }, [projects, documents]);

  return (
    <section
      aria-label="Top 5 des clients par valeur totale de projet"
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-5"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Synthèse Portefeuille Clients · Payé vs Impayé</span>
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
            Top 5 Clients par Valeur Totale de Projet (Ventilation Payé vs Impayé)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Classement en temps réel des 5 principaux clients selon la valeur cumulée de leurs projets, avec décomposition directe des montants encaissés et des soldes restant à recouvrer.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 shrink-0 text-xs">
          <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="text-[10px] font-semibold text-slate-500">Valeur Cumulée Top 5</div>
            <div className="font-mono font-extrabold text-slate-900 dark:text-white mt-0.5">
              {formatCurrency(analytics.grandTotalValue, currency)}
            </div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60">
            <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              Total Payé ({analytics.grandPaidPct}%)
            </div>
            <div className="font-mono font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">
              {formatCurrency(analytics.grandTotalPaid, currency)}
            </div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60">
            <div className="text-[10px] font-semibold text-rose-700 dark:text-rose-300">
              Total Impayé ({Math.max(0, 100 - analytics.grandPaidPct)}%)
            </div>
            <div className="font-mono font-extrabold text-rose-700 dark:text-rose-300 mt-0.5">
              {formatCurrency(analytics.grandTotalUnpaid, currency)}
            </div>
          </div>
        </div>
      </div>

      {analytics.rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-500">
          Aucun projet ou facture client enregistré pour le moment. Créez un projet ou une facture pour visualiser le classement des 5 premiers clients par valeur totale de projet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Liste détaillée des 5 premiers clients avec barres de progression Payé vs Impayé */}
          <div className="lg:col-span-7 space-y-3">
            {analytics.rows.map((client, idx) => {
              const isSelected =
                selectedClientFilter !== 'all' &&
                selectedClientFilter.trim().toLowerCase() === client.clientName.toLowerCase();
              return (
                <div
                  key={client.clientName}
                  className={`rounded-xl border p-3.5 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-slate-900 dark:bg-blue-600 text-white font-mono font-extrabold text-xs flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                            {client.clientName}
                          </h3>
                          <span className="text-[11px] font-medium text-slate-500">
                            · {client.projectsCount} projet(s)
                          </span>
                        </div>
                        {client.projectNames.length > 0 && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            Projets : {client.projectNames.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right font-mono tabular-nums">
                      <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                        {formatCurrency(client.totalProjectValue, currency)}
                      </div>
                      <div className="text-[10px] text-slate-500">Valeur Totale Projets</div>
                    </div>
                  </div>

                  {/* Barre de répartition visuelle Payé vs Impayé */}
                  <div className="mt-3 space-y-1.5">
                    <div className="w-full h-2.5 rounded-full bg-rose-100 dark:bg-rose-950/70 overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-600 transition-all duration-300"
                        style={{ width: `${client.paidPct}%` }}
                        title={`Payé : ${formatCurrency(client.paidAmount, currency)} (${client.paidPct}%)`}
                      />
                      <div
                        className="h-full bg-rose-500/85 transition-all duration-300"
                        style={{ width: `${client.unpaidPct}%` }}
                        title={`Impayé : ${formatCurrency(client.unpaidAmount, currency)} (${client.unpaidPct}%)`}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                          Payé : {formatCurrency(client.paidAmount, currency)} ({client.paidPct}%)
                        </span>
                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                          Impayé : {formatCurrency(client.unpaidAmount, currency)} ({client.unpaidPct}%)
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 font-sans">
                        {onSelectClientFilter && (
                          <button
                            type="button"
                            onClick={() =>
                              onSelectClientFilter(isSelected ? 'all' : client.clientName)
                            }
                            className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                          >
                            {isSelected ? 'Réinitialiser filtre' : 'Isoler sur le Dashboard'}
                          </button>
                        )}
                        {onOpenDossiersForClient && (
                          <button
                            type="button"
                            onClick={() => onOpenDossiersForClient(client.clientName)}
                            className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-semibold cursor-pointer"
                          >
                            Ouvrir Dossiers
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Graphique comparatif Recharts : Payé vs Impayé pour le Top 5 Clients */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Graphique Comparatif : Payé vs Impayé (Top 5 Clients)
              </span>
              <span className="text-[11px] font-mono text-slate-500">Devise : {currency}</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.rows}
                  margin={{ top: 8, right: 12, left: 4, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.35} />
                  <XAxis
                    dataKey="shortClientName"
                    tick={{ fontSize: 10 }}
                    interval={0}
                    angle={-12}
                    textAnchor="end"
                    height={46}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(val: any) => formatCurrency(Number(val) || 0, currency)}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar
                    dataKey="paidAmount"
                    name="Montant Payé (Encaissé)"
                    stackId="clientValue"
                    fill="#059669"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="unpaidAmount"
                    name="Montant Impayé (Reste à Payer)"
                    stackId="clientValue"
                    fill="#e11d48"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

// ============================================================================
// 6. SECTION 'DOSSIERS' : TÉLÉVERSEMENT & ORGANISATION DES DOCUMENTS
//    SUPPLÉMENTAIRES DE PROJET (PHOTOS DE CHANTIER, PDF TECHNIQUES,
//    COMPTES-RENDUS DE RÉUNION) DANS DES DOSSIERS SPÉCIFIQUES À CHAQUE PROJET
// ============================================================================

export type SupplementaryDocCategory =
  | 'site_photo'
  | 'technical_pdf'
  | 'meeting_minutes'
  | 'hse_quality_report';

export interface SupplementaryProjectDocumentRecord {
  id: string;
  tenantId: string;
  projectId: string;
  projectName: string;
  clientName: string;
  subfolderName: string;
  category: SupplementaryDocCategory;
  title: string;
  fileName: string;
  mimeType: string;
  fileSizeKb: number;
  dataUrl: string;
  notesOrMinutesSummary?: string;
  uploadedBy: string;
  uploadedAt: string;
}

const SUPPLEMENTARY_DOC_CATEGORY_META: Record<
  SupplementaryDocCategory,
  { label: string; defaultSubfolder: string; badgeClass: string }
> = {
  site_photo: {
    label: 'Photo de Chantier (Site Photo)',
    defaultSubfolder: '01 · Photos de Chantier & Inspections',
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  },
  technical_pdf: {
    label: 'Plan & PDF Technique (Technical PDF)',
    defaultSubfolder: '02 · Plans, Schémas & PDF Techniques',
    badgeClass:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
  },
  meeting_minutes: {
    label: 'Compte-Rendu de Réunion / PV (Meeting Minutes)',
    defaultSubfolder: '03 · Comptes-Rendus de Réunion & PV',
    badgeClass:
      'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  },
  hse_quality_report: {
    label: 'Rapport QHSE, Bordereau & Annexe',
    defaultSubfolder: '04 · Rapports QHSE & Annexes Techniques',
    badgeClass:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
  },
};

const DEFAULT_PROJECT_SUBFOLDERS = [
  '01 · Photos de Chantier & Inspections',
  '02 · Plans, Schémas & PDF Techniques',
  '03 · Comptes-Rendus de Réunion & PV',
  '04 · Rapports QHSE & Annexes Techniques',
];

export const ProjectSupplementaryDossiersManager: React.FC<{
  tenantId: string;
  companyName: string;
  currentUserName: string;
  projects: Array<{
    id: string;
    name: string;
    clientName: string;
    status?: string;
  }>;
  initialClientFilter?: string;
  onTriggerToast?: (msg: string) => void;
}> = ({
  tenantId,
  companyName,
  currentUserName,
  projects,
  initialClientFilter,
  onTriggerToast,
}) => {
  const storageKey = `mep_project_supplementary_dossiers_${tenantId || 'default'}`;
  const subfoldersStorageKey = `mep_project_custom_subfolders_${tenantId || 'default'}`;

  const [dossierFiles, setDossierFiles] = useState<SupplementaryProjectDocumentRecord[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [customSubfoldersByProject, setCustomSubfoldersByProject] = useState<
    Record<string, string[]>
  >(() => {
    try {
      const raw = localStorage.getItem(subfoldersStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {
      // ignore
    }
    return {};
  });

  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedSubfolder, setSelectedSubfolder] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<
    'all' | SupplementaryDocCategory
  >('all');
  const [searchQuery, setSearchQuery] = useState<string>(initialClientFilter || '');
  const [showUploadPanel, setShowUploadPanel] = useState<boolean>(true);
  const [previewItem, setPreviewItem] = useState<SupplementaryProjectDocumentRecord | null>(null);

  // Upload & Organization Form State
  const [targetProjectId, setTargetProjectId] = useState<string>(projects[0]?.id || 'general');
  const [docCategory, setDocCategory] = useState<SupplementaryDocCategory>('site_photo');
  const [targetSubfolder, setTargetSubfolder] = useState<string>(
    SUPPLEMENTARY_DOC_CATEGORY_META.site_photo.defaultSubfolder
  );
  const [docTitle, setDocTitle] = useState<string>('');
  const [docMinutesSummary, setDocMinutesSummary] = useState<string>('');
  const [newSubfolderInput, setNewSubfolderInput] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initialClientFilter) {
      setSearchQuery(initialClientFilter);
    }
  }, [initialClientFilter]);

  useEffect(() => {
    if (projects.length > 0 && (targetProjectId === 'general' || !targetProjectId)) {
      setTargetProjectId(projects[0].id);
    }
  }, [projects, targetProjectId]);

  // Synchronize with backend API and SSE stream
  useEffect(() => {
    let mounted = true;
    fetch(`/api/saas/project-dossiers?tenantId=${encodeURIComponent(tenantId || 'default')}`)
      .then((r) => r.json())
      .then((data) => {
        if (!mounted || !data?.ok) return;
        if (Array.isArray(data.items) && data.items.length > 0) {
          setDossierFiles(data.items);
        }
        if (data.customSubfolders && typeof data.customSubfolders === 'object') {
          setCustomSubfoldersByProject((prev) => ({ ...prev, ...data.customSubfolders }));
        }
      })
      .catch(() => {});

    let es: EventSource | null = null;
    try {
      es = new EventSource(
        `/api/messaging/stream?tenantId=${encodeURIComponent(tenantId || 'default')}`
      );
      es.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          if (
            payload?.type === 'project_dossiers_updated' &&
            payload.tenantId === (tenantId || 'default')
          ) {
            fetch(`/api/saas/project-dossiers?tenantId=${encodeURIComponent(tenantId || 'default')}`)
              .then((r) => r.json())
              .then((d) => {
                if (d?.ok && Array.isArray(d.items)) {
                  setDossierFiles(d.items);
                }
              })
              .catch(() => {});
          }
        } catch {
          // ignore
        }
      };
    } catch {
      // ignore
    }

    return () => {
      mounted = false;
      es?.close();
    };
  }, [tenantId]);

  const persistDossiers = (nextList: SupplementaryProjectDocumentRecord[]) => {
    setDossierFiles(nextList);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextList));
    } catch {
      // ignore
    }
  };

  const availableProjectFolders = useMemo(() => {
    const base = projects.map((p) => ({
      id: p.id,
      name: p.name,
      clientName: p.clientName || 'Client Entreprise',
    }));
    if (base.length === 0) {
      base.push({
        id: 'general',
        name: `Dossier Technique Général — ${companyName}`,
        clientName: companyName,
      });
    }
    return base;
  }, [projects, companyName]);

  const subfoldersForTargetProject = useMemo(() => {
    const custom = customSubfoldersByProject[targetProjectId] || [];
    return Array.from(new Set([...DEFAULT_PROJECT_SUBFOLDERS, ...custom]));
  }, [customSubfoldersByProject, targetProjectId]);

  const handleCategoryChange = (nextCat: SupplementaryDocCategory) => {
    setDocCategory(nextCat);
    setTargetSubfolder(SUPPLEMENTARY_DOC_CATEGORY_META[nextCat].defaultSubfolder);
  };

  const handleCreateCustomSubfolder = async () => {
    const cleanName = newSubfolderInput.trim();
    if (!cleanName) return;
    const pId = selectedProjectId !== 'all' ? selectedProjectId : targetProjectId;
    const currentList = customSubfoldersByProject[pId] || [];
    if (!currentList.includes(cleanName)) {
      const updatedMap = {
        ...customSubfoldersByProject,
        [pId]: [...currentList, cleanName],
      };
      setCustomSubfoldersByProject(updatedMap);
      try {
        localStorage.setItem(subfoldersStorageKey, JSON.stringify(updatedMap));
      } catch {
        // ignore
      }
      try {
        await fetch('/api/saas/project-dossiers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            action: 'create_subfolder',
            projectId: pId,
            folderName: cleanName,
          }),
        });
      } catch {
        // ignore
      }
    }
    setTargetSubfolder(cleanName);
    setNewSubfolderInput('');
    onTriggerToast?.(`Sous-dossier « ${cleanName} » créé dans le dossier projet.`);
  };

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const projObj =
      availableProjectFolders.find((p) => p.id === targetProjectId) || availableProjectFolders[0];

    Array.from(fileList).forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
        const inferredCategory: SupplementaryDocCategory = file.type.startsWith('image/')
          ? 'site_photo'
          : file.type === 'application/pdf'
            ? 'technical_pdf'
            : docCategory;
        const effectiveTitle =
          docTitle.trim() && fileList.length === 1
            ? docTitle.trim()
            : file.name.replace(/\.[^/.]+$/, '');

        const newRecord: SupplementaryProjectDocumentRecord = {
          id: `dossier_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
          tenantId: tenantId || 'default',
          projectId: projObj.id,
          projectName: projObj.name,
          clientName: projObj.clientName,
          subfolderName:
            targetSubfolder || SUPPLEMENTARY_DOC_CATEGORY_META[inferredCategory].defaultSubfolder,
          category: inferredCategory,
          title: effectiveTitle,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileSizeKb: Math.max(1, Math.round(file.size / 1024)),
          dataUrl,
          notesOrMinutesSummary: docMinutesSummary.trim() || undefined,
          uploadedBy: currentUserName || 'Collaborateur',
          uploadedAt: new Date().toISOString(),
        };

        setDossierFiles((prev) => {
          const next = [newRecord, ...prev];
          try {
            localStorage.setItem(storageKey, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });

        try {
          await fetch('/api/saas/project-dossiers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId, item: newRecord }),
          });
        } catch {
          // ignore
        }
      };
      reader.readAsDataURL(file);
    });

    setDocTitle('');
    setDocMinutesSummary('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onTriggerToast?.(
      `${fileList.length} document(s) supplémentaire(s) classé(s) dans le dossier du projet « ${projObj.name} ».`
    );
  };

  // Allow direct creation of a structured Meeting Minutes / Technical Note document if no external file is attached
  const handleSaveStructuredMeetingMinutes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() && !docMinutesSummary.trim()) {
      onTriggerToast?.(
        'Veuillez téléverser un fichier ou saisir le titre et le compte-rendu de réunion / note technique.'
      );
      return;
    }
    const projObj =
      availableProjectFolders.find((p) => p.id === targetProjectId) || availableProjectFolders[0];
    const titleStr =
      docTitle.trim() ||
      `Compte-Rendu de Réunion — ${projObj.name} (${new Date().toLocaleDateString('fr-FR')})`;
    const textContent = `ENTREPRISE : ${companyName}\nPROJET : ${projObj.name} (Client : ${projObj.clientName})\nDOSSIER : ${targetSubfolder}\nTITRE : ${titleStr}\nAUTEUR : ${currentUserName}\nDATE : ${new Date().toLocaleString('fr-FR')}\n\n--- CONTENU & DÉCISIONS ---\n${docMinutesSummary.trim() || 'Document technique enregistré dans le dossier du projet.'}`;
    const dataUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(textContent)}`;

    const newRecord: SupplementaryProjectDocumentRecord = {
      id: `dossier_pv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tenantId: tenantId || 'default',
      projectId: projObj.id,
      projectName: projObj.name,
      clientName: projObj.clientName,
      subfolderName: targetSubfolder,
      category: docCategory,
      title: titleStr,
      fileName: `${titleStr.toLowerCase().replace(/[^a-z0-9]+/gi, '_')}.txt`,
      mimeType: 'text/plain',
      fileSizeKb: Math.max(1, Math.ceil(textContent.length / 1024)),
      dataUrl,
      notesOrMinutesSummary: docMinutesSummary.trim(),
      uploadedBy: currentUserName || 'Collaborateur',
      uploadedAt: new Date().toISOString(),
    };

    const next = [newRecord, ...dossierFiles];
    persistDossiers(next);
    setDocTitle('');
    setDocMinutesSummary('');

    try {
      await fetch('/api/saas/project-dossiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, item: newRecord }),
      });
    } catch {
      // ignore
    }

    onTriggerToast?.(
      `Document « ${titleStr} » enregistré dans le dossier « ${projObj.name} / ${targetSubfolder} ».`
    );
  };

  const handleMoveDocumentFolder = async (
    docItem: SupplementaryProjectDocumentRecord,
    nextProjectId: string,
    nextSubfolder: string
  ) => {
    const projObj =
      availableProjectFolders.find((p) => p.id === nextProjectId) || availableProjectFolders[0];
    const updated: SupplementaryProjectDocumentRecord = {
      ...docItem,
      projectId: projObj.id,
      projectName: projObj.name,
      clientName: projObj.clientName,
      subfolderName: nextSubfolder,
    };
    const nextList = dossierFiles.map((d) => (d.id === docItem.id ? updated : d));
    persistDossiers(nextList);
    try {
      await fetch('/api/saas/project-dossiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, item: updated }),
      });
    } catch {
      // ignore
    }
    onTriggerToast?.(
      `Document déplacé vers « ${projObj.name} · ${nextSubfolder} ».`
    );
  };

  const handleDeleteDossierDocument = async (id: string) => {
    const next = dossierFiles.filter((d) => d.id !== id);
    persistDossiers(next);
    if (previewItem?.id === id) setPreviewItem(null);
    try {
      await fetch(
        `/api/saas/project-dossiers/${encodeURIComponent(id)}?tenantId=${encodeURIComponent(tenantId || 'default')}`,
        { method: 'DELETE' }
      );
    } catch {
      // ignore
    }
    onTriggerToast?.('Document retiré du dossier projet.');
  };

  const filteredDossierFiles = useMemo(() => {
    return dossierFiles.filter((item) => {
      if (selectedProjectId !== 'all' && item.projectId !== selectedProjectId) return false;
      if (selectedSubfolder !== 'all' && item.subfolderName !== selectedSubfolder) return false;
      if (selectedCategoryFilter !== 'all' && item.category !== selectedCategoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          item.title.toLowerCase().includes(q) ||
          item.fileName.toLowerCase().includes(q) ||
          item.projectName.toLowerCase().includes(q) ||
          item.clientName.toLowerCase().includes(q) ||
          item.subfolderName.toLowerCase().includes(q) ||
          (item.notesOrMinutesSummary || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [
    dossierFiles,
    selectedProjectId,
    selectedSubfolder,
    selectedCategoryFilter,
    searchQuery,
  ]);

  const countsByCategory = useMemo(() => {
    return {
      site_photo: dossierFiles.filter((d) => d.category === 'site_photo').length,
      technical_pdf: dossierFiles.filter((d) => d.category === 'technical_pdf').length,
      meeting_minutes: dossierFiles.filter((d) => d.category === 'meeting_minutes').length,
      hse_quality_report: dossierFiles.filter((d) => d.category === 'hse_quality_report').length,
    };
  }, [dossierFiles]);

  return (
    <section
      aria-label="Dossiers de Projets et Documents Supplémentaires"
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-5"
    >
      {/* En-tête de la section Dossiers */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <FolderOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Référentiel Documentaire par Projet · Dossiers &amp; Pièces Supplémentaires</span>
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
            Dossiers de Projet : Photos de Chantier, PDF Techniques &amp; Comptes-Rendus de Réunion
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Téléversez, classez et organisez toutes les pièces techniques supplémentaires (photos de chantier, plans PDF, PV et comptes-rendus de réunion) dans des dossiers dédiés à chaque projet.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUploadPanel((prev) => !prev)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>
              {showUploadPanel
                ? 'Masquer le panneau de téléversement'
                : '+ Téléverser / Ajouter au Dossier'}
            </span>
          </button>
        </div>
      </div>

      {/* Compteurs rapides par type de document supplémentaire */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <button
          type="button"
          onClick={() =>
            setSelectedCategoryFilter((prev) => (prev === 'site_photo' ? 'all' : 'site_photo'))
          }
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedCategoryFilter === 'site_photo'
              ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 dark:text-slate-300">Photos de Chantier</span>
            <ImageIcon className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-mono font-extrabold text-sm text-slate-900 dark:text-white mt-1">
            {countsByCategory.site_photo} fichier(s)
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setSelectedCategoryFilter((prev) =>
              prev === 'technical_pdf' ? 'all' : 'technical_pdf'
            )
          }
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedCategoryFilter === 'technical_pdf'
              ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Plans &amp; PDF Techniques
            </span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="font-mono font-extrabold text-sm text-slate-900 dark:text-white mt-1">
            {countsByCategory.technical_pdf} fichier(s)
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setSelectedCategoryFilter((prev) =>
              prev === 'meeting_minutes' ? 'all' : 'meeting_minutes'
            )
          }
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedCategoryFilter === 'meeting_minutes'
              ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Comptes-Rendus &amp; PV
            </span>
            <FileCheck2 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-mono font-extrabold text-sm text-slate-900 dark:text-white mt-1">
            {countsByCategory.meeting_minutes} fichier(s)
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setSelectedCategoryFilter((prev) =>
              prev === 'hse_quality_report' ? 'all' : 'hse_quality_report'
            )
          }
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            selectedCategoryFilter === 'hse_quality_report'
              ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/30'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Rapports QHSE &amp; Annexes
            </span>
            <Folder className="w-4 h-4 text-purple-600" />
          </div>
          <div className="font-mono font-extrabold text-sm text-slate-900 dark:text-white mt-1">
            {countsByCategory.hse_quality_report} fichier(s)
          </div>
        </button>
      </div>

      {/* Zone de téléversement et d'organisation dans un dossier de projet spécifique */}
      {showUploadPanel && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-slate-50/90 dark:bg-slate-950 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                1. Dossier Projet Cible *
              </label>
              <select
                value={targetProjectId}
                onChange={(e) => setTargetProjectId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold"
              >
                {availableProjectFolders.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    📁 {proj.name} ({proj.clientName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                2. Type de Document Supplémentaire *
              </label>
              <select
                value={docCategory}
                onChange={(e) =>
                  handleCategoryChange(e.target.value as SupplementaryDocCategory)
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold"
              >
                <option value="site_photo">📷 Photo de Chantier (Site Photo)</option>
                <option value="technical_pdf">📐 Plan / PDF Technique (Technical PDF)</option>
                <option value="meeting_minutes">
                  📝 Compte-Rendu de Réunion / PV (Meeting Minutes)
                </option>
                <option value="hse_quality_report">🛡️ Rapport QHSE / Bordereau Technique</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                3. Sous-Dossier du Projet *
              </label>
              <select
                value={targetSubfolder}
                onChange={(e) => setTargetSubfolder(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold"
              >
                {subfoldersForTargetProject.map((sf) => (
                  <option key={sf} value={sf}>
                    {sf}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Créer un Nouveau Sous-Dossier Projet
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newSubfolderInput}
                  onChange={(e) => setNewSubfolderInput(e.target.value)}
                  placeholder="Ex: 05 · Réception Lot Gros Œuvre"
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs"
                />
                <button
                  type="button"
                  onClick={handleCreateCustomSubfolder}
                  className="px-2.5 py-2 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                  title="Créer ce sous-dossier dans le projet sélectionné"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Créer</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Zone Drag & Drop / Sélecteur de fichiers (Photos de chantier, PDF techniques, PV...) */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFilesSelected(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="lg:col-span-5 rounded-xl border-2 border-dashed border-blue-400 dark:border-blue-700 bg-white dark:bg-slate-900 p-4 flex flex-col items-center justify-center text-center gap-2 cursor-pointer hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                Cliquez ou glissez-déposez vos fichiers ici
              </div>
              <p className="text-[11px] text-slate-500">
                Photos de chantier (JPG, PNG, WEBP), Plans &amp; PDF techniques, Comptes-rendus de réunion (PDF, DOCX, TXT)
              </p>
            </div>

            {/* Saisie / Annotation / Rédaction directe d'un Compte-Rendu de Réunion ou Note Technique */}
            <form
              onSubmit={handleSaveStructuredMeetingMinutes}
              className="lg:col-span-7 flex flex-col justify-between gap-2.5 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Intitulé du document ou de la réunion
                  </label>
                  <input
                    type="text"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="Ex: PV Réunion de Chantier N°04 / Plan Ferraillage..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Auteur / Responsable du dépôt
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={currentUserName || 'Collaborateur'}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Synthèse du Compte-Rendu de Réunion / Observation Technique
                </label>
                <textarea
                  rows={2}
                  value={docMinutesSummary}
                  onChange={(e) => setDocMinutesSummary(e.target.value)}
                  placeholder="Points abordés, décisions validées sur le chantier, réserves techniques ou légende de la photo..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg border border-blue-600 text-blue-600 dark:text-blue-400 text-xs font-bold cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/40"
                >
                  Choisir un fichier (Photo / PDF)...
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Enregistrer le Compte-Rendu / Note dans le Dossier</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Explorateur de Dossiers Spécifiques par Projet & Liste des Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Arborescence des Dossiers par Projet (Colonne Gauche) */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 p-3.5 space-y-2.5 text-xs">
          <div className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <span>Arborescence des Dossiers Projets</span>
            <span className="font-mono text-blue-600 dark:text-blue-400">
              {dossierFiles.length} pièce(s)
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedProjectId('all');
              setSelectedSubfolder('all');
            }}
            className={`w-full text-left px-3 py-2 rounded-lg font-bold flex items-center justify-between cursor-pointer transition ${
              selectedProjectId === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <span className="flex items-center gap-2 truncate">
              <FolderOpen className="w-4 h-4 shrink-0" />
              <span>Tous les Dossiers Projets</span>
            </span>
            <span className="font-mono text-[11px]">{dossierFiles.length}</span>
          </button>

          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {availableProjectFolders.map((proj) => {
              const projFiles = dossierFiles.filter((f) => f.projectId === proj.id);
              const isProjSelected = selectedProjectId === proj.id;
              const projSubfolders = Array.from(
                new Set([
                  ...DEFAULT_PROJECT_SUBFOLDERS,
                  ...(customSubfoldersByProject[proj.id] || []),
                  ...projFiles.map((f) => f.subfolderName),
                ])
              );

              return (
                <div
                  key={proj.id}
                  className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProjectId(proj.id);
                      setTargetProjectId(proj.id);
                      setSelectedSubfolder('all');
                    }}
                    className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 cursor-pointer transition ${
                      isProjSelected
                        ? 'bg-slate-900 text-white dark:bg-blue-950/80'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold truncate flex items-center gap-1.5">
                        <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">{proj.name}</span>
                      </div>
                      <div
                        className={`text-[10px] truncate ${
                          isProjSelected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        Client : {proj.clientName}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono font-bold text-[10px] shrink-0">
                      {projFiles.length}
                    </span>
                  </button>

                  {isProjSelected && (
                    <div className="px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 space-y-1">
                      {projSubfolders.map((sf) => {
                        const sfCount = projFiles.filter((f) => f.subfolderName === sf).length;
                        const isSfActive = selectedSubfolder === sf;
                        return (
                          <button
                            key={sf}
                            type="button"
                            onClick={() =>
                              setSelectedSubfolder((prev) => (prev === sf ? 'all' : sf))
                            }
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] flex items-center justify-between gap-2 cursor-pointer ${
                              isSfActive
                                ? 'bg-blue-600 text-white font-bold'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                            }`}
                          >
                            <span className="truncate">↳ {sf}</span>
                            <span className="font-mono text-[10px]">{sfCount}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Contenu du Dossier Sélectionné (Colonne Droite) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par titre, projet, client, sous-dossier ou compte-rendu..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-8 pr-3 py-2 text-xs"
              />
            </div>

            {selectedCategoryFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('all')}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                Afficher toutes les catégories
              </button>
            )}
          </div>

          {filteredDossierFiles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center space-y-2">
              <FolderOpen className="w-7 h-7 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Aucun document supplémentaire dans ce dossier de projet
              </p>
              <p className="text-[11px] text-slate-500">
                Utilisez la zone ci-dessus pour téléverser des photos de chantier, des plans PDF techniques ou enregistrer un compte-rendu de réunion dans ce dossier.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredDossierFiles.map((item) => {
                const catMeta =
                  SUPPLEMENTARY_DOC_CATEGORY_META[item.category] ||
                  SUPPLEMENTARY_DOC_CATEGORY_META.technical_pdf;
                const isImage = item.mimeType.startsWith('image/');

                return (
                  <article
                    key={item.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 p-3.5 flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold ${catMeta.badgeClass}`}
                        >
                          {catMeta.label}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {item.fileSizeKb} Ko ·{' '}
                          {new Date(item.uploadedAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>

                      {isImage && item.dataUrl && (
                        <div className="h-32 w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900/5">
                          <img
                            src={item.dataUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div>
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                          {item.title}
                        </h4>
                        <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                          📁 {item.projectName} · {item.subfolderName}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Client : {item.clientName} · Déposé par {item.uploadedBy}
                        </p>
                      </div>

                      {item.notesOrMinutesSummary && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800 line-clamp-3 whitespace-pre-line">
                          {item.notesOrMinutesSummary}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                      {/* Sélecteur rapide pour déplacer/réorganiser le fichier dans un autre dossier projet ou sous-dossier */}
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-slate-500 shrink-0">Classer dans :</span>
                        <select
                          value={item.projectId}
                          onChange={(e) =>
                            handleMoveDocumentFolder(item, e.target.value, item.subfolderName)
                          }
                          aria-label="Déplacer vers un autre dossier projet"
                          className="flex-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-1 font-semibold truncate"
                        >
                          {availableProjectFolders.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewItem(item)}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Aperçu</span>
                          </button>
                          <a
                            href={item.dataUrl}
                            download={item.fileName}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-bold flex items-center gap-1 text-slate-700 dark:text-slate-200"
                          >
                            <Download className="w-3 h-3" />
                            <span>Télécharger</span>
                          </a>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteDossierDocument(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Supprimer ce document du dossier"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal d'aperçu de document supplémentaire (Photo de Chantier / PDF Technique / Compte-Rendu) */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  📁 {previewItem.projectName} · {previewItem.subfolderName}
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {previewItem.title}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Fichier : {previewItem.fileName} ({previewItem.fileSizeKb} Ko) · Déposé par{' '}
                  {previewItem.uploadedBy}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {previewItem.mimeType.startsWith('image/') && previewItem.dataUrl ? (
                <img
                  src={previewItem.dataUrl}
                  alt={previewItem.title}
                  className="max-h-[55vh] w-auto mx-auto rounded-xl border border-slate-200 dark:border-slate-800"
                />
              ) : previewItem.mimeType === 'application/pdf' && previewItem.dataUrl ? (
                <iframe
                  src={previewItem.dataUrl}
                  title={previewItem.title}
                  className="w-full h-[55vh] rounded-xl border border-slate-200 dark:border-slate-800"
                />
              ) : null}

              {previewItem.notesOrMinutesSummary && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs whitespace-pre-line text-slate-800 dark:text-slate-200">
                  {previewItem.notesOrMinutesSummary}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <a
                href={previewItem.dataUrl}
                download={previewItem.fileName}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger ({previewItem.fileName})</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

