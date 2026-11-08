import React, { useMemo, useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  FileEdit,
  Flag,
  FolderKanban,
  GitBranch,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  Sparkles,
  TrendingUp,
  UserCheck,
  Zap,
} from 'lucide-react';
import { ExportableProject, ProjectExecutionStep } from '../utils/exporters';
import { Currency, formatCurrency } from '../utils/i18n';

export interface ProjectGanttChartProps {
  projects: ExportableProject[];
  currency: Currency;
  onOpenExecutionPlan?: (project: any) => void;
  onExportExecutionPlanPdf?: (project: any) => void;
  onUpdateProject?: (updatedProject: any, auditReason?: string) => void;
  onEditProject?: (project: any) => void;
}

interface ComputedGanttStep {
  step: ProjectExecutionStep;
  phaseNumber: number;
  title: string;
  tradeName: string;
  tradeLeaderName: string;
  projectManagerName: string;
  durationLabel: string;
  durationDays: number;
  deliverable: string;
  progressPct: number;
  expectedProgressTodayPct: number;
  startDay: number;
  endDay: number;
  startPct: number;
  widthPct: number;
  startDateFormatted: string;
  endDateFormatted: string;
  startDateIso: string;
  endDateIso: string;
  status: 'completed' | 'in_progress' | 'upcoming';
  isMilestoneReached: boolean;
  isCriticalPath: boolean;
  slackDays: number;
  dependsOnPhase: number | null;
  isBehindSchedule: boolean;
  hasResourceConflict: boolean;
  estimatedPhaseBudget: number;
}

function parseDurationDays(rawDuration?: string): number {
  if (!rawDuration) return 14;
  const lower = rawDuration.toLowerCase();
  const numbers = lower.match(/\d+/g)?.map(Number) || [];
  if (numbers.length === 0) return 14;
  const avg =
    numbers.length >= 2
      ? Math.round((numbers[0] + numbers[1]) / 2)
      : numbers[0];
  if (lower.includes('mois')) return Math.max(7, avg * 30);
  if (lower.includes('semaine')) return Math.max(5, avg * 7);
  return Math.max(3, avg);
}

function buildFallbackStructuredSteps(project: ExportableProject): ProjectExecutionStep[] {
  if (project.structuredSteps && project.structuredSteps.length > 0) {
    return project.structuredSteps;
  }
  const trades =
    project.involvedTrades && project.involvedTrades.length > 0
      ? project.involvedTrades
      : [
          'Ingénierie & Implantation',
          'Exécution Principale & Gros Œuvre',
          'Second Œuvre & Équipements Techniques',
          'Contrôle Qualité, Essais & Réception',
        ];
  const baseProgress = Math.max(0, Math.min(100, Number(project.progress) || 0));

  return trades.map((trade, idx) => {
    const stepProgress =
      baseProgress >= ((idx + 1) / trades.length) * 100
        ? 100
        : baseProgress <= (idx / trades.length) * 100
        ? 0
        : Math.round(
            ((baseProgress - (idx / trades.length) * 100) / (100 / trades.length)) * 100
          );
    return {
      phaseNumber: idx + 1,
      tradeName: trade,
      tradeLeaderName: `Chef Corps de Métier — ${trade}`,
      projectManagerName: project.projectManagerName || 'Direction de Projet',
      title: `Phase ${idx + 1} : Exécution & Coordination — ${trade}`,
      processDetails: `Travaux techniques, suivi qualité et validation contradictoire du lot ${trade}`,
      assignedTasks: `Exécution opérationnelle et contrôle conformité (${trade})`,
      phaseObjectives: `Validation 100% du livrable de la phase ${idx + 1}`,
      duration: '15 à 20 jours',
      deliverable: `PV de réception technique — Lot ${trade}`,
      progressPct: Math.max(0, Math.min(100, stepProgress)),
    };
  });
}

export const ProjectGanttChart: React.FC<ProjectGanttChartProps> = ({
  projects,
  currency,
  onOpenExecutionPlan,
  onExportExecutionPlanPdf,
  onUpdateProject,
  onEditProject,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('first');
  const [viewMode, setViewMode] = useState<'single_project' | 'portfolio_master'>('single_project');
  const [tradeLeaderFilter, setTradeLeaderFilter] = useState<string>('all');
  const [phaseStatusFilter, setPhaseStatusFilter] = useState<
    'all' | 'critical' | 'behind' | 'in_progress' | 'completed'
  >('all');
  const [phaseSearchQuery, setPhaseSearchQuery] = useState<string>('');
  const [zoomScale, setZoomScale] = useState<'weeks' | 'months' | 'milestones'>('weeks');
  const [showCriticalPathOnly, setShowCriticalPathOnly] = useState<boolean>(false);
  const [showProactiveCopilot, setShowProactiveCopilot] = useState<boolean>(true);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [editingPhaseIndex, setEditingPhaseIndex] = useState<number | null>(null);
  const [editPhaseTitle, setEditPhaseTitle] = useState<string>('');
  const [editPhaseTrade, setEditPhaseTrade] = useState<string>('');
  const [editPhaseLeader, setEditPhaseLeader] = useState<string>('');
  const [editPhaseDuration, setEditPhaseDuration] = useState<string>('');
  const [editPhaseDeliverable, setEditPhaseDeliverable] = useState<string>('');
  const [showQuickAddPhase, setShowQuickAddPhase] = useState<boolean>(false);
  const [newPhaseTitle, setNewPhaseTitle] = useState<string>('');
  const [newPhaseTrade, setNewPhaseTrade] = useState<string>('');
  const [newPhaseLeader, setNewPhaseLeader] = useState<string>('');
  const [newPhaseDuration, setNewPhaseDuration] = useState<string>('14 jours');
  const [newPhaseDeliverable, setNewPhaseDeliverable] = useState<string>('PV de validation technique');
  const [dragState, setDragState] = useState<{
    phaseIndex: number;
    mode: 'move' | 'resize_left' | 'resize_right' | 'progress';
    initialClientX: number;
    trackWidthPx: number;
    initialStartDay: number;
    initialDurationDays: number;
    initialProgressPct: number;
    previewStartDay: number;
    previewDurationDays: number;
    previewProgressPct: number;
  } | null>(null);
  const [lastGanttDragNotice, setLastGanttDragNotice] = useState<string>('');
  const [realtimeSyncPulse, setRealtimeSyncPulse] = useState<{
    syncedAt: string;
    actor: string;
    action: string;
    projectId: string;
  } | null>(null);

  const activeProject = useMemo<ExportableProject | null>(() => {
    if (projects.length === 0) return null;
    if (selectedProjectId === 'first') return projects[0];
    return projects.find((p) => p.id === selectedProjectId) || projects[0];
  }, [projects, selectedProjectId]);

  // Mécanisme de Synchronisation Temps Réel Multi-Sessions (SSE & BroadcastChannel)
  useEffect(() => {
    let sse: EventSource | null = null;
    let bc: BroadcastChannel | null = null;

    // 1. Écoute du flux SSE du serveur
    try {
      if (typeof EventSource !== 'undefined') {
        sse = new EventSource('/api/messaging/stream');
        sse.addEventListener('project_phases_updated', (ev: MessageEvent) => {
          try {
            const data = JSON.parse(ev.data);
            if (data?.project && (!activeProject || data.projectId === activeProject.id || data.project.id === activeProject.id)) {
              setRealtimeSyncPulse({
                syncedAt: data.updatedAt || new Date().toISOString(),
                actor: data.actor || 'Autre session',
                action: data.auditReason || 'Mise à jour des phases',
                projectId: data.projectId || data.project.id,
              });
              // Déclenchement de la mise à jour locale si différent
              if (onUpdateProject && data.project) {
                onUpdateProject(data.project, `[Synchro Réseau SSE] ${data.auditReason || 'Mise à jour reçue'}`);
              }
            }
          } catch {
            // ignore
          }
        });
      }
    } catch {
      // ignore
    }

    // 2. Écoute cross-tabs & cross-sessions locale via BroadcastChannel
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('mep_realtime_collab_v1');
        bc.onmessage = (ev) => {
          const msg = ev?.data;
          if (msg?.type === 'project:live_update' && msg.payload) {
            const incoming = msg.payload as any;
            setRealtimeSyncPulse({
              syncedAt: new Date().toISOString(),
              actor: 'Session connectée',
              action: incoming.lastModifiedAction || 'Modification planning temps réel',
              projectId: incoming.id,
            });
          }
        };
      }
    } catch {
      // ignore
    }

    // 3. Écoute de l'événement personnalisé local de fenêtre
    const handleLocalSyncEvent = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.project) {
        setRealtimeSyncPulse({
          syncedAt: new Date().toISOString(),
          actor: detail.actor || 'Session active',
          action: detail.action || 'Phases synchronisées',
          projectId: detail.project.id,
        });
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('mep:gantt-phase-synced', handleLocalSyncEvent);
    }

    return () => {
      sse?.close();
      bc?.close();
      if (typeof window !== 'undefined') {
        window.removeEventListener('mep:gantt-phase-synced', handleLocalSyncEvent);
      }
    };
  }, [activeProject, onUpdateProject]);

  const ganttData = useMemo(() => {
    if (!activeProject) {
      return {
        steps: [] as ComputedGanttStep[],
        totalDays: 60,
        projectStartTime: Date.now() - 30 * 86400000,
        todayPct: 50,
        expectedTimeProgressPct: 50,
        effectiveProgressPct: 0,
        spi: 1,
        cpi: 1,
        projectedDelayDays: 0,
        projectedCompletionDateFormatted: '',
        criticalPhasesCount: 0,
        behindScheduleCount: 0,
        resourceConflictsCount: 0,
        tradeLeaders: [] as string[],
        timelineMarkers: [] as Array<{ label: string; subLabel: string; pct: number }>,
        projectMilestones: [] as Array<{
          id: string;
          label: string;
          pct: number;
          reached: boolean;
          deliverable: string;
        }>,
        recommendations: [] as Array<{
          id: string;
          severity: 'critical' | 'warning' | 'opportunity';
          title: string;
          detail: string;
          actionLabel?: string;
          actionType?: 'fast_track' | 'sync_progress' | 'balance_leaders';
        }>,
      };
    }

    const rawSteps = buildFallbackStructuredSteps(activeProject);
    const parsedDurations = rawSteps.map((st) => parseDurationDays(st.duration));
    const totalDurationWeight = Math.max(
      1,
      parsedDurations.reduce((acc, d) => acc + d, 0)
    );

    // Calculate sequential schedule with realistic 85% overlap (Finish-to-Start with lead time) or explicit user-dragged startDayOffset
    let cursorDay = 0;
    const stepSpans = rawSteps.map((st, idx) => {
      const dur = Math.max(2, parsedDurations[idx]);
      const explicitOffset =
        typeof st.startDayOffset === 'number' && Number.isFinite(st.startDayOffset)
          ? Math.max(0, Math.round(st.startDayOffset))
          : null;
      const start = explicitOffset !== null ? explicitOffset : cursorDay;
      const end = start + dur;
      cursorDay = Math.max(cursorDay, start + Math.max(3, Math.round(dur * 0.85)));
      return { start, end, dur };
    });

    const totalDays = Math.max(
      21,
      stepSpans.reduce((max, sp) => Math.max(max, sp.end + 4), 0)
    );

    const nowMs = Date.now();
    const dueTime = activeProject.dueDate
      ? new Date(`${activeProject.dueDate.slice(0, 10)}T00:00:00`).getTime()
      : nowMs + Math.round(totalDays * 0.45) * 86400000;
    const validDueTime = Number.isFinite(dueTime)
      ? dueTime
      : nowMs + Math.round(totalDays * 0.45) * 86400000;
    const projectStartTime = validDueTime - totalDays * 86400000;

    // Position of Today (J-0) on the project timeline
    const elapsedDays = Math.max(
      0,
      Math.min(totalDays, Math.round((nowMs - projectStartTime) / 86400000))
    );
    const todayPct = Math.max(2, Math.min(98, Math.round((elapsedDays / totalDays) * 100)));
    const expectedTimeProgressPct = Math.max(
      0,
      Math.min(100, Math.round((elapsedDays / totalDays) * 100))
    );

    const projectOverallProgress = Math.max(
      0,
      Math.min(100, Number(activeProject.progress) || 0)
    );

    // Detect leader overlaps first
    const leaderSpansMap = new Map<string, Array<{ idx: number; start: number; end: number }>>();
    rawSteps.forEach((st, idx) => {
      const tradeName = st.tradeName || 'Tous Corps d’État';
      const leader =
        st.tradeLeaderName && st.tradeLeaderName.trim()
          ? st.tradeLeaderName.trim()
          : `Chef de Lot — ${tradeName}`;
      const list = leaderSpansMap.get(leader) || [];
      list.push({ idx, start: stepSpans[idx].start, end: stepSpans[idx].end });
      leaderSpansMap.set(leader, list);
    });

    const totalBudget = Math.max(0, Number(activeProject.budget) || 0);

    const computedSteps: ComputedGanttStep[] = rawSteps.map((st, idx) => {
      const span = stepSpans[idx];
      const explicitPct =
        typeof st.progressPct === 'number' && Number.isFinite(st.progressPct)
          ? Math.max(0, Math.min(100, Math.round(st.progressPct)))
          : projectOverallProgress >= Math.round(((idx + 1) / rawSteps.length) * 100)
          ? 100
          : projectOverallProgress <= Math.round((idx / rawSteps.length) * 100)
          ? 0
          : projectOverallProgress;

      const status: ComputedGanttStep['status'] =
        explicitPct >= 100 ? 'completed' : explicitPct > 0 ? 'in_progress' : 'upcoming';

      const startDate = new Date(projectStartTime + span.start * 86400000);
      const endDate = new Date(projectStartTime + span.end * 86400000);

      const startPct = Math.max(0, Math.min(92, (span.start / totalDays) * 100));
      const widthPct = Math.max(8, Math.min(100 - startPct, (span.dur / totalDays) * 100));

      const tradeName = st.tradeName || 'Tous Corps d’État';
      const tradeLeaderName =
        st.tradeLeaderName && st.tradeLeaderName.trim()
          ? st.tradeLeaderName.trim()
          : `Chef de Lot — ${tradeName}`;

      // Expected progress for this specific phase as of today
      const expectedProgressTodayPct =
        elapsedDays <= span.start
          ? 0
          : elapsedDays >= span.end
          ? 100
          : Math.round(((elapsedDays - span.start) / Math.max(1, span.dur)) * 100);

      const isBehindSchedule =
        explicitPct < 100 && expectedProgressTodayPct - explicitPct >= 15;

      // Critical path: longest duration phases, last phase, or phases with zero float
      const nextStart = idx < stepSpans.length - 1 ? stepSpans[idx + 1].start : totalDays;
      const slackDays = Math.max(0, nextStart - span.end);
      const isCriticalPath =
        slackDays === 0 ||
        idx === rawSteps.length - 1 ||
        span.dur >= Math.round(totalDurationWeight / Math.max(1, rawSteps.length));

      // Check if leader has overlapping incomplete phases
      const leaderList = leaderSpansMap.get(tradeLeaderName) || [];
      const hasResourceConflict =
        explicitPct < 100 &&
        leaderList.some(
          (other) =>
            other.idx !== idx &&
            other.start < span.end &&
            other.end > span.start
        );

      const estimatedPhaseBudget = Math.round(
        totalBudget * (span.dur / totalDurationWeight)
      );

      return {
        step: st,
        phaseNumber: Number(st.phaseNumber) || idx + 1,
        title: st.title || `Phase ${idx + 1} — ${tradeName}`,
        tradeName,
        tradeLeaderName,
        projectManagerName:
          st.projectManagerName || activeProject.projectManagerName || 'Direction de Projet',
        durationLabel: st.duration || `${span.dur} jours`,
        durationDays: span.dur,
        deliverable: st.deliverable || `PV de validation Phase ${idx + 1}`,
        progressPct: explicitPct,
        expectedProgressTodayPct,
        startDay: span.start,
        endDay: span.end,
        startPct,
        widthPct,
        startDateFormatted: startDate.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
        }),
        endDateFormatted: endDate.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
        }),
        startDateIso: st.startDate || startDate.toISOString().slice(0, 10),
        endDateIso: st.endDate || endDate.toISOString().slice(0, 10),
        status,
        isMilestoneReached: explicitPct >= 100,
        isCriticalPath,
        slackDays,
        dependsOnPhase: idx > 0 ? idx : null,
        isBehindSchedule,
        hasResourceConflict,
        estimatedPhaseBudget,
      };
    });

    const tradeLeaders = Array.from(
      new Set(computedSteps.map((s) => s.tradeLeaderName))
    );

    const timelineMarkers: Array<{ label: string; subLabel: string; pct: number }> = [];
    if (zoomScale === 'weeks') {
      const weekCount = Math.min(10, Math.max(4, Math.ceil(totalDays / 7)));
      for (let i = 0; i < weekCount; i++) {
        const dayOffset = Math.round((i / weekCount) * totalDays);
        const d = new Date(projectStartTime + dayOffset * 86400000);
        timelineMarkers.push({
          label: `Sem. ${i + 1}`,
          subLabel: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
          pct: (i / weekCount) * 100,
        });
      }
    } else if (zoomScale === 'months') {
      const colCount = 6;
      for (let i = 0; i < colCount; i++) {
        const dayOffset = Math.round((i / colCount) * totalDays);
        const d = new Date(projectStartTime + dayOffset * 86400000);
        timelineMarkers.push({
          label: `J+${dayOffset}`,
          subLabel: d.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: '2-digit',
          }),
          pct: (i / colCount) * 100,
        });
      }
    } else {
      [
        { label: 'Jalon 0%', subLabel: 'Ouverture Site', pct: 0 },
        { label: 'Jalon 25%', subLabel: 'Implantation & Lot 1', pct: 25 },
        { label: 'Jalon 50%', subLabel: 'Mi-Parcours', pct: 50 },
        { label: 'Jalon 75%', subLabel: 'Finitions & Essais', pct: 75 },
        { label: 'Jalon 100%', subLabel: 'Réception Finale', pct: 92 },
      ].forEach((m) => timelineMarkers.push(m));
    }

    const weightedPhaseProgress =
      computedSteps.length > 0
        ? Math.round(
            computedSteps.reduce((acc, s) => acc + s.progressPct * s.durationDays, 0) /
              Math.max(1, computedSteps.reduce((acc, s) => acc + s.durationDays, 0))
          )
        : projectOverallProgress;
    const effectiveProgressPct = Math.max(projectOverallProgress, weightedPhaseProgress);

    // SPI (Schedule Performance Index) & CPI (Cost Performance Index)
    const spi =
      expectedTimeProgressPct > 5
        ? Number((effectiveProgressPct / expectedTimeProgressPct).toFixed(2))
        : 1.0;
    const billedRatio =
      totalBudget > 0 ? (Number(activeProject.billedAmount) || 0) / totalBudget : 0;
    const cpi =
      billedRatio > 0.05
        ? Number(((effectiveProgressPct / 100) / billedRatio).toFixed(2))
        : 1.04;

    const projectedDelayDays =
      effectiveProgressPct >= 100
        ? 0
        : spi < 0.98
        ? Math.min(90, Math.max(1, Math.round((1 - spi) * totalDays * 0.6)))
        : 0;
    const projectedEndDate = new Date(validDueTime + projectedDelayDays * 86400000);
    const projectedCompletionDateFormatted = projectedEndDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const criticalPhasesCount = computedSteps.filter((s) => s.isCriticalPath).length;
    const behindScheduleCount = computedSteps.filter((s) => s.isBehindSchedule).length;
    const resourceConflictsCount = computedSteps.filter((s) => s.hasResourceConflict).length;

    const projectMilestones = [
      {
        id: 'm25',
        label: 'Jalon 25% — Démarrage & Implantation',
        pct: 25,
        reached: effectiveProgressPct >= 25,
        deliverable: computedSteps[0]?.deliverable || 'PV d’ouverture & implantation',
      },
      {
        id: 'm50',
        label: 'Jalon 50% — Exécution Mi-Parcours',
        pct: 50,
        reached: effectiveProgressPct >= 50,
        deliverable:
          computedSteps[Math.floor(computedSteps.length / 2)]?.deliverable ||
          'Validation intermédiaire des ouvrages',
      },
      {
        id: 'm75',
        label: 'Jalon 75% — Second Œuvre & Essais Techniques',
        pct: 75,
        reached: effectiveProgressPct >= 75,
        deliverable:
          computedSteps[Math.max(0, computedSteps.length - 2)]?.deliverable ||
          'Cahier d’essais techniques',
      },
      {
        id: 'm100',
        label: 'Jalon 100% — Réception Définitive & Clôture',
        pct: 100,
        reached: effectiveProgressPct >= 100,
        deliverable:
          computedSteps[computedSteps.length - 1]?.deliverable ||
          'PV de Réception Définitive sans réserve',
      },
    ];

    // Build Proactive Recommendations
    const recommendations: Array<{
      id: string;
      severity: 'critical' | 'warning' | 'opportunity';
      title: string;
      detail: string;
      actionLabel?: string;
      actionType?: 'fast_track' | 'sync_progress' | 'balance_leaders';
    }> = [];

    if (behindScheduleCount > 0 || spi < 0.92) {
      recommendations.push({
        id: 'rec_delay',
        severity: 'critical',
        title: `${behindScheduleCount} phase(s) en retard par rapport au curseur J-0 (SPI = ${spi})`,
        detail: `Glissement estimé de +${projectedDelayDays}j (Atterrissage prévu : ${projectedCompletionDateFormatted}). Activez le Fast-Tracking pour comprimer les délais des lots restants de 15%.`,
        actionLabel: 'Activer Fast-Tracking (-15% durée)',
        actionType: 'fast_track',
      });
    }

    if (Math.abs(weightedPhaseProgress - projectOverallProgress) >= 3) {
      recommendations.push({
        id: 'rec_sync',
        severity: 'opportunity',
        title: `Écart détecté entre l'avancement des phases (${weightedPhaseProgress}%) et le projet (${projectOverallProgress}%)`,
        detail: `Alignez automatiquement le taux d'avancement global du projet sur la moyenne pondérée des phases d'exécution.`,
        actionLabel: `Synchroniser à ${weightedPhaseProgress}%`,
        actionType: 'sync_progress',
      });
    }

    if (resourceConflictsCount > 0) {
      recommendations.push({
        id: 'rec_conflict',
        severity: 'warning',
        title: `${resourceConflictsCount} phase(s) présentent une surcharge Chef de Lot en chevauchement`,
        detail: `Un même Chef de Corps de Métier supervise simultanément plusieurs lots actifs. Répartissez automatiquement les affectations.`,
        actionLabel: 'Équilibrer les Chefs de Lot',
        actionType: 'balance_leaders',
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        id: 'rec_nominal',
        severity: 'opportunity',
        title: `Cadence d'exécution optimale (SPI ${spi} · CPI ${cpi})`,
        detail: `Toutes les phases du chemin critique respectent la trajectoire cible vers l'échéance du ${activeProject.dueDate}.`,
      });
    }

    return {
      steps: computedSteps,
      totalDays,
      projectStartTime,
      todayPct,
      expectedTimeProgressPct,
      effectiveProgressPct,
      spi,
      cpi,
      projectedDelayDays,
      projectedCompletionDateFormatted,
      criticalPhasesCount,
      behindScheduleCount,
      resourceConflictsCount,
      tradeLeaders,
      timelineMarkers,
      projectMilestones,
      recommendations,
    };
  }, [activeProject, zoomScale]);

  const filteredSteps = useMemo(() => {
    return ganttData.steps.filter((s) => {
      if (tradeLeaderFilter !== 'all' && s.tradeLeaderName !== tradeLeaderFilter) {
        return false;
      }
      if (showCriticalPathOnly && !s.isCriticalPath) {
        return false;
      }
      if (phaseStatusFilter === 'critical' && !s.isCriticalPath) return false;
      if (phaseStatusFilter === 'behind' && !s.isBehindSchedule) return false;
      if (phaseStatusFilter === 'in_progress' && s.status !== 'in_progress') return false;
      if (phaseStatusFilter === 'completed' && s.status !== 'completed') return false;
      if (phaseSearchQuery.trim()) {
        const q = phaseSearchQuery.toLowerCase();
        const match =
          s.title.toLowerCase().includes(q) ||
          s.tradeName.toLowerCase().includes(q) ||
          s.tradeLeaderName.toLowerCase().includes(q) ||
          s.deliverable.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [
    ganttData.steps,
    tradeLeaderFilter,
    showCriticalPathOnly,
    phaseStatusFilter,
    phaseSearchQuery,
  ]);

  if (projects.length === 0) {
    return null;
  }

  const completedPhasesCount = ganttData.steps.filter((s) => s.status === 'completed').length;
  const activePhasesCount = ganttData.steps.filter((s) => s.status === 'in_progress').length;

  // Interactive Handlers for Direct Phase & Schedule Manipulation
  const handleUpdatePhaseProgress = (phaseIndex: number, nextPct: number) => {
    if (!activeProject || !onUpdateProject) return;
    const clampedPct = Math.max(0, Math.min(100, Math.round(nextPct)));
    const baseSteps = buildFallbackStructuredSteps(activeProject);
    const updatedSteps: ProjectExecutionStep[] = baseSteps.map((st, idx) =>
      idx === phaseIndex ? { ...st, progressPct: clampedPct } : st
    );

    const durations = updatedSteps.map((st) => parseDurationDays(st.duration));
    const totalWeight = Math.max(
      1,
      durations.reduce((a, b) => a + b, 0)
    );
    const weightedAvg = Math.round(
      updatedSteps.reduce(
        (acc, st, i) => acc + (Number(st.progressPct) || 0) * durations[i],
        0
      ) / totalWeight
    );

    const nextStatus =
      weightedAvg >= 100
        ? 'completed'
        : weightedAvg > 0
        ? 'active'
        : activeProject.status || 'planning';

    onUpdateProject(
      {
        ...activeProject,
        structuredSteps: updatedSteps,
        progress: weightedAvg,
        status: nextStatus,
      },
      `Mise à jour directe GANTT — Phase ${phaseIndex + 1} portée à ${clampedPct}% (Avancement global : ${weightedAvg}%)`
    );
  };

  const handleUpdatePhaseScheduleAndProgress = (
    phaseIndex: number,
    nextStartDay: number,
    nextDurationDays: number,
    nextProgressPct: number,
    explicitStartDateIso?: string,
    explicitEndDateIso?: string
  ) => {
    if (!activeProject || !onUpdateProject) return;
    const clampedStart = Math.max(0, Math.round(nextStartDay));
    const clampedDur = Math.max(2, Math.round(nextDurationDays));
    const clampedPct = Math.max(0, Math.min(100, Math.round(nextProgressPct)));
    const baseSteps = buildFallbackStructuredSteps(activeProject);

    const startDateObj = explicitStartDateIso
      ? new Date(`${explicitStartDateIso}T00:00:00`)
      : new Date(ganttData.projectStartTime + clampedStart * 86400000);
    const endDateObj = explicitEndDateIso
      ? new Date(`${explicitEndDateIso}T00:00:00`)
      : new Date(ganttData.projectStartTime + (clampedStart + clampedDur) * 86400000);

    const startIso = Number.isFinite(startDateObj.getTime())
      ? startDateObj.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const endIso = Number.isFinite(endDateObj.getTime())
      ? endDateObj.toISOString().slice(0, 10)
      : new Date(Date.now() + clampedDur * 86400000).toISOString().slice(0, 10);

    const updatedSteps: ProjectExecutionStep[] = baseSteps.map((st, idx) =>
      idx === phaseIndex
        ? {
            ...st,
            startDayOffset: clampedStart,
            duration: `${clampedDur} jours`,
            startDate: startIso,
            endDate: endIso,
            progressPct: clampedPct,
          }
        : st
    );

    const durations = updatedSteps.map((st) => parseDurationDays(st.duration));
    const totalWeight = Math.max(
      1,
      durations.reduce((a, b) => a + b, 0)
    );
    const weightedAvg = Math.round(
      updatedSteps.reduce(
        (acc, st, i) => acc + (Number(st.progressPct) || 0) * durations[i],
        0
      ) / totalWeight
    );

    const nextStatus =
      weightedAvg >= 100
        ? 'completed'
        : weightedAvg > 0
        ? 'active'
        : activeProject.status || 'planning';

    const summaryMsg = `Phase P${phaseIndex + 1} replanifiée (${startIso} → ${endIso} · ${clampedDur}j · ${clampedPct}%)`;
    setLastGanttDragNotice(summaryMsg);

    onUpdateProject(
      {
        ...activeProject,
        structuredSteps: updatedSteps,
        progress: weightedAvg,
        status: nextStatus,
      },
      `Glisser-Déposer GANTT Interactif — ${summaryMsg}`
    );
  };

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      setDragState((prev) => {
        if (!prev) return null;
        const deltaX = e.clientX - prev.initialClientX;
        const safeTrackWidth = Math.max(140, prev.trackWidthPx);

        if (prev.mode === 'move') {
          const deltaDays = Math.round((deltaX / safeTrackWidth) * ganttData.totalDays);
          const nextStart = Math.max(0, prev.initialStartDay + deltaDays);
          return { ...prev, previewStartDay: nextStart };
        }

        if (prev.mode === 'resize_right') {
          const deltaDays = Math.round((deltaX / safeTrackWidth) * ganttData.totalDays);
          const nextDur = Math.max(2, prev.initialDurationDays + deltaDays);
          return { ...prev, previewDurationDays: nextDur };
        }

        if (prev.mode === 'resize_left') {
          const deltaDays = Math.round((deltaX / safeTrackWidth) * ganttData.totalDays);
          const clampedDelta = Math.min(
            prev.initialDurationDays - 2,
            Math.max(-prev.initialStartDay, deltaDays)
          );
          return {
            ...prev,
            previewStartDay: prev.initialStartDay + clampedDelta,
            previewDurationDays: prev.initialDurationDays - clampedDelta,
          };
        }

        if (prev.mode === 'progress') {
          const barWidthPx = Math.max(
            48,
            (prev.initialDurationDays / Math.max(1, ganttData.totalDays)) * safeTrackWidth
          );
          const deltaPct = Math.round((deltaX / barWidthPx) * 100);
          const nextPct = Math.max(0, Math.min(100, prev.initialProgressPct + deltaPct));
          return { ...prev, previewProgressPct: nextPct };
        }

        return prev;
      });
    };

    const handlePointerUp = () => {
      setDragState((prev) => {
        if (prev) {
          const changed =
            prev.previewStartDay !== prev.initialStartDay ||
            prev.previewDurationDays !== prev.initialDurationDays ||
            prev.previewProgressPct !== prev.initialProgressPct;
          if (changed) {
            setTimeout(() => {
              handleUpdatePhaseScheduleAndProgress(
                prev.phaseIndex,
                prev.previewStartDay,
                prev.previewDurationDays,
                prev.previewProgressPct
              );
            }, 0);
          }
        }
        return null;
      });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, ganttData.totalDays, ganttData.projectStartTime, activeProject]);

  const handleSaveInlinePhaseEdit = (phaseIndex: number) => {
    if (!activeProject || !onUpdateProject) return;
    const baseSteps = buildFallbackStructuredSteps(activeProject);
    const updatedSteps: ProjectExecutionStep[] = baseSteps.map((st, idx) =>
      idx === phaseIndex
        ? {
            ...st,
            title: editPhaseTitle.trim() || st.title,
            tradeName: editPhaseTrade.trim() || st.tradeName,
            tradeLeaderName: editPhaseLeader.trim() || st.tradeLeaderName,
            duration: editPhaseDuration.trim() || st.duration,
            deliverable: editPhaseDeliverable.trim() || st.deliverable,
          }
        : st
    );
    onUpdateProject(
      {
        ...activeProject,
        structuredSteps: updatedSteps,
      },
      `Modification rapide GANTT — Phase ${phaseIndex + 1} (${editPhaseTitle.trim() || 'Phase mise à jour'})`
    );
    setEditingPhaseIndex(null);
  };

  const handleQuickAddPhase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !onUpdateProject || !newPhaseTitle.trim()) return;
    const baseSteps = buildFallbackStructuredSteps(activeProject);
    const nextPhaseNum = baseSteps.length + 1;
    const addedStep: ProjectExecutionStep = {
      phaseNumber: nextPhaseNum,
      tradeName: newPhaseTrade.trim() || activeProject.involvedTrades?.[0] || 'Génie Civil & Lot Technique',
      tradeLeaderName:
        newPhaseLeader.trim() ||
        `Chef de Lot — ${newPhaseTrade.trim() || 'Spécialiste'}`,
      projectManagerName: activeProject.projectManagerName || 'Direction de Projet',
      title: newPhaseTitle.trim(),
      processDetails: `Exécution technique et contrôle contradictoire — ${newPhaseTitle.trim()}`,
      assignedTasks: newPhaseTitle.trim(),
      phaseObjectives: `Validation à 100% du livrable : ${newPhaseDeliverable.trim()}`,
      duration: newPhaseDuration.trim() || '14 jours',
      deliverable: newPhaseDeliverable.trim() || `PV de réception Phase ${nextPhaseNum}`,
      progressPct: 0,
    };

    const updatedSteps = [...baseSteps, addedStep];
    const nextTrades = Array.from(
      new Set([...(activeProject.involvedTrades || []), addedStep.tradeName || ''])
    ).filter(Boolean);

    onUpdateProject(
      {
        ...activeProject,
        structuredSteps: updatedSteps,
        involvedTrades: nextTrades,
      },
      `Ajout de la Phase ${nextPhaseNum} ("${addedStep.title}") depuis le module GANTT intelligent`
    );
    setNewPhaseTitle('');
    setNewPhaseTrade('');
    setNewPhaseLeader('');
    setShowQuickAddPhase(false);
  };

  const handleExecuteProactiveAction = (
    actionType: 'fast_track' | 'sync_progress' | 'balance_leaders'
  ) => {
    if (!activeProject || !onUpdateProject) return;
    const baseSteps = buildFallbackStructuredSteps(activeProject);

    if (actionType === 'fast_track') {
      const compressedSteps = baseSteps.map((st) => {
        const currentDays = parseDurationDays(st.duration);
        if ((Number(st.progressPct) || 0) >= 100) return st;
        const compressedDays = Math.max(3, Math.round(currentDays * 0.85));
        return {
          ...st,
          duration: `${compressedDays} jours (Fast-Track)`,
        };
      });
      onUpdateProject(
        {
          ...activeProject,
          structuredSteps: compressedSteps,
        },
        `Optimisation proactive GANTT (Fast-Tracking -15% sur les phases actives/restantes)`
      );
    } else if (actionType === 'sync_progress') {
      const durations = baseSteps.map((st) => parseDurationDays(st.duration));
      const totalWeight = Math.max(
        1,
        durations.reduce((a, b) => a + b, 0)
      );
      const syncedProgress = Math.round(
        baseSteps.reduce(
          (acc, st, i) => acc + (Number(st.progressPct) || 0) * durations[i],
          0
        ) / totalWeight
      );
      onUpdateProject(
        {
          ...activeProject,
          progress: syncedProgress,
          status:
            syncedProgress >= 100
              ? 'completed'
              : syncedProgress > 0
              ? 'active'
              : activeProject.status,
        },
        `Synchronisation intelligente de l'avancement global du projet à ${syncedProgress}%`
      );
    } else if (actionType === 'balance_leaders') {
      const balancedSteps = baseSteps.map((st, idx) => ({
        ...st,
        tradeLeaderName: `Chef Lot P${idx + 1} — ${st.tradeName || 'Spécialiste'}`,
      }));
      onUpdateProject(
        {
          ...activeProject,
          structuredSteps: balancedSteps,
        },
        `Équilibrage proactif des Chefs de Corps de Métier sur ${balancedSteps.length} phases`
      );
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4 text-xs">
      {/* Top Executive Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                Moteur GANTT Exécutif &amp; Chemin Critique (CPM)
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Synchro Temps Réel Multi-Sessions Active</span>
              </span>
              <span>·</span>
              <span>
                {ganttData.steps.length} Phases · {ganttData.criticalPhasesCount} Critiques ·{' '}
                {ganttData.tradeLeaders.length} Chefs de Lot
              </span>
              <span>·</span>
              <span
                className={`font-mono font-bold ${
                  ganttData.spi >= 0.98
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                SPI : {ganttData.spi} · CPI : {ganttData.cpi}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-0.5 flex flex-wrap items-center gap-2">
              <span>Planification Intelligente GANTT — Pilotage Proactif, Dépendances &amp; Ordonnancement</span>
              {realtimeSyncPulse && (
                <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono animate-fade-in">
                  Synchronisé : {realtimeSyncPulse.action} ({new Date(realtimeSyncPulse.syncedAt).toLocaleTimeString('fr-FR')})
                </span>
              )}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Selector: Single Project vs Master Portfolio */}
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('single_project')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                viewMode === 'single_project'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Vue Détaillée Projet
            </button>
            <button
              type="button"
              onClick={() => setViewMode('portfolio_master')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                viewMode === 'portfolio_master'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Master Portefeuille ({projects.length})
            </button>
          </div>

          {viewMode === 'single_project' && (
            <select
              value={activeProject?.id || ''}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setTradeLeaderFilter('all');
                setEditingPhaseIndex(null);
              }}
              aria-label="Sélectionner le projet pour le diagramme de GANTT"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white cursor-pointer max-w-[260px]"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.clientName}) — {p.progress}%
                </option>
              ))}
            </select>
          )}

          {activeProject && onEditProject && (
            <button
              type="button"
              onClick={() => onEditProject(activeProject)}
              className="px-2.5 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer"
              title="Modifier les paramètres généraux, le budget et le cahier des charges de ce projet"
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>Modifier Projet</span>
            </button>
          )}

          {activeProject && onOpenExecutionPlan && (
            <button
              type="button"
              onClick={() => onOpenExecutionPlan(activeProject)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Plan &amp; Lots</span>
            </button>
          )}

          {activeProject && onExportExecutionPlanPdf && (
            <button
              type="button"
              onClick={() => onExportExecutionPlanPdf(activeProject)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
              title="Exporter le Plan d'Exécution & GANTT en PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF Planning</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Déplier</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Réduire</span>
              </>
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && viewMode === 'portfolio_master' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
              <div className="text-[11px] text-slate-500">Portefeuille Actif</div>
              <div className="text-lg font-extrabold font-mono text-slate-900 dark:text-white mt-0.5 tabular-nums">
                {projects.length} projet(s)
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
              <div className="text-[11px] text-slate-500">Avancement Moyen Portefeuille</div>
              <div className="text-lg font-extrabold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 tabular-nums">
                {Math.round(
                  projects.reduce((s, p) => s + (Number(p.progress) || 0), 0) /
                    Math.max(1, projects.length)
                )}
                %
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
              <div className="text-[11px] text-slate-500">Volume Budgétaire Consolidé</div>
              <div className="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
                {formatCurrency(
                  projects.reduce((s, p) => s + (Number(p.budget) || 0), 0),
                  currency
                )}
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
              <div className="text-[11px] text-slate-500">Projets Achevés (100%)</div>
              <div className="text-lg font-extrabold font-mono text-blue-600 dark:text-blue-400 mt-0.5 tabular-nums">
                {
                  projects.filter(
                    (p) => p.status === 'completed' || (Number(p.progress) || 0) >= 100
                  ).length
                }{' '}
                / {projects.length}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-950 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between font-bold text-slate-700 dark:text-slate-300">
              <span>Master GANTT Multi-Projets — Comparatif Chronologique &amp; Santé Budgétaire</span>
              <span className="text-[11px] text-slate-500">
                Cliquez sur un projet pour ouvrir son GANTT détaillé par phase
              </span>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {projects.map((proj) => {
                const prog = Math.max(0, Math.min(100, Number(proj.progress) || 0));
                const stepsCount = buildFallbackStructuredSteps(proj).length;
                const isOverBudget = (Number(proj.billedAmount) || 0) > (Number(proj.budget) || 0);
                return (
                  <div
                    key={proj.id}
                    className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors grid grid-cols-1 lg:grid-cols-12 gap-3 items-center"
                  >
                    <div className="lg:col-span-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProjectId(proj.id);
                            setViewMode('single_project');
                          }}
                          className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left cursor-pointer"
                        >
                          {proj.name}
                        </button>
                        <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                          {prog}%
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5">
                        <span>{proj.clientName}</span>
                        <span>·</span>
                        <span>{stepsCount} phases</span>
                        <span>·</span>
                        <span>Échéance : {proj.dueDate}</span>
                      </div>
                    </div>

                    <div className="lg:col-span-5">
                      <div className="relative h-7 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center">
                        <div
                          className={`h-full transition-all duration-300 ${
                            prog >= 100
                              ? 'bg-emerald-600'
                              : isOverBudget
                              ? 'bg-rose-600'
                              : 'bg-indigo-600'
                          }`}
                          style={{ width: `${Math.max(4, prog)}%` }}
                        />
                        <div className="absolute inset-0 px-2.5 flex items-center justify-between text-[10px] font-bold pointer-events-none">
                          <span
                            className={
                              prog > 45 ? 'text-white' : 'text-slate-800 dark:text-slate-200'
                            }
                          >
                            {(proj as any).duration || proj.estimatedDuration || 'Planning actif'} · Chef :{' '}
                            {proj.projectManagerName || 'Direction'}
                          </span>
                          <span className="font-mono text-slate-900 dark:text-white bg-white/80 dark:bg-slate-900/80 px-1.5 py-0.5 rounded">
                            {formatCurrency(proj.budget, proj.currency || currency)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProjectId(proj.id);
                          setViewMode('single_project');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] hover:bg-indigo-100 cursor-pointer"
                      >
                        Inspecter Phases
                      </button>
                      {onEditProject && (
                        <button
                          type="button"
                          onClick={() => onEditProject(proj)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 font-semibold text-[11px] cursor-pointer"
                        >
                          Modifier
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!isCollapsed && viewMode === 'single_project' && activeProject && (
        <>
          {/* Intelligent Telemetry & Proactive Copilot Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50">
              <div className="text-[10px] font-semibold text-slate-500">
                Indice Délais (SPI)
              </div>
              <div
                className={`text-sm font-extrabold font-mono mt-0.5 tabular-nums ${
                  ganttData.spi >= 0.98
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {ganttData.spi}{' '}
                <span className="text-[10px] font-sans font-normal text-slate-500">
                  ({ganttData.spi >= 0.98 ? 'Dans les temps' : 'Glissement'})
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50">
              <div className="text-[10px] font-semibold text-slate-500">
                Avancement Réel vs Théorique J-0
              </div>
              <div className="text-sm font-extrabold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 tabular-nums">
                {ganttData.effectiveProgressPct}%{' '}
                <span className="text-[10px] text-slate-500 font-normal">
                  / cible {ganttData.expectedTimeProgressPct}%
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50">
              <div className="text-[10px] font-semibold text-slate-500">
                Chemin Critique (CPM)
              </div>
              <div className="text-sm font-extrabold font-mono text-rose-600 dark:text-rose-400 mt-0.5 tabular-nums">
                {ganttData.criticalPhasesCount} phase(s){' '}
                <span className="text-[10px] font-sans font-normal text-slate-500">
                  marge 0j
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50">
              <div className="text-[10px] font-semibold text-slate-500">
                Atterrissage Estimé (EAC)
              </div>
              <div className="text-sm font-extrabold font-mono text-slate-900 dark:text-white mt-0.5 tabular-nums">
                {ganttData.projectedCompletionDateFormatted}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50">
              <div className="text-[10px] font-semibold text-slate-500">
                Phases en Retard / Alerte
              </div>
              <div
                className={`text-sm font-extrabold font-mono mt-0.5 tabular-nums ${
                  ganttData.behindScheduleCount > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {ganttData.behindScheduleCount} phase(s)
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50">
              <div className="text-[10px] font-semibold text-slate-500">
                Indice Coûts (CPI)
              </div>
              <div className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
                {ganttData.cpi} · {formatCurrency(activeProject.budget, activeProject.currency || currency)}
              </div>
            </div>
          </div>

          {/* Proactive Diagnostic & 1-Click Auto-Optimization Panel */}
          {showProactiveCopilot && (
            <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="font-bold text-slate-900 dark:text-white">
                    Intelligence Proactive d&apos;Ordonnancement &amp; Recommandations Temps Réel
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickAddPhase((prev) => !prev)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Ajouter une Phase</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowProactiveCopilot(false)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Masquer
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {ganttData.recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className={`p-3 rounded-lg border bg-white dark:bg-slate-900 flex flex-col justify-between gap-2 ${
                      rec.severity === 'critical'
                        ? 'border-rose-300 dark:border-rose-800'
                        : rec.severity === 'warning'
                        ? 'border-amber-300 dark:border-amber-800'
                        : 'border-emerald-300 dark:border-emerald-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                        {rec.severity === 'critical' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        ) : rec.severity === 'warning' ? (
                          <Activity className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        ) : (
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                        <span>{rec.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-snug">
                        {rec.detail}
                      </p>
                    </div>
                    {rec.actionLabel && rec.actionType && onUpdateProject && (
                      <button
                        type="button"
                        onClick={() => handleExecuteProactiveAction(rec.actionType!)}
                        className="self-start px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Zap className="w-3 h-3" />
                        <span>{rec.actionLabel}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Add Phase Inline Form */}
          {showQuickAddPhase && (
            <form
              onSubmit={handleQuickAddPhase}
              className="p-3.5 rounded-xl border border-blue-300 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">
                  Nouvelle Phase Technique dans le GANTT ({activeProject.name})
                </span>
                <button
                  type="button"
                  onClick={() => setShowQuickAddPhase(false)}
                  className="text-slate-500 hover:text-slate-800"
                >
                  Fermer ✕
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                <input
                  type="text"
                  required
                  value={newPhaseTitle}
                  onChange={(e) => setNewPhaseTitle(e.target.value)}
                  placeholder="Intitulé de la phase *"
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5"
                />
                <input
                  type="text"
                  value={newPhaseTrade}
                  onChange={(e) => setNewPhaseTrade(e.target.value)}
                  placeholder="Corps de métier (ex: Électricité)"
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5"
                />
                <input
                  type="text"
                  value={newPhaseLeader}
                  onChange={(e) => setNewPhaseLeader(e.target.value)}
                  placeholder="Chef de Corps de Métier"
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5"
                />
                <input
                  type="text"
                  value={newPhaseDuration}
                  onChange={(e) => setNewPhaseDuration(e.target.value)}
                  placeholder="Durée (ex: 15 jours)"
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-mono"
                />
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newPhaseDeliverable}
                    onChange={(e) => setNewPhaseDeliverable(e.target.value)}
                    placeholder="Livrable jalon"
                    className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold whitespace-nowrap cursor-pointer"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Filter & Search Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: `Toutes (${ganttData.steps.length})` },
                  {
                    id: 'critical',
                    label: `Chemin Critique (${ganttData.criticalPhasesCount})`,
                  },
                  {
                    id: 'behind',
                    label: `En Retard J-0 (${ganttData.behindScheduleCount})`,
                  },
                  { id: 'in_progress', label: `En Cours (${activePhasesCount})` },
                  { id: 'completed', label: `Terminées (${completedPhasesCount})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPhaseStatusFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    phaseStatusFilter === tab.id
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={phaseSearchQuery}
                  onChange={(e) => setPhaseSearchQuery(e.target.value)}
                  placeholder="Rechercher phase, lot, livrable..."
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-2.5 py-1 text-[11px] w-48"
                />
              </div>

              <select
                value={tradeLeaderFilter}
                onChange={(e) => setTradeLeaderFilter(e.target.value)}
                aria-label="Filtrer par Chef de Corps de Métier"
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <option value="all">
                  Tous les Chefs de Lot ({ganttData.tradeLeaders.length})
                </option>
                {ganttData.tradeLeaders.map((leader) => (
                  <option key={leader} value={leader}>
                    {leader}
                  </option>
                ))}
              </select>

              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5">
                {(
                  [
                    { id: 'weeks', label: 'Semaines' },
                    { id: 'months', label: 'Calendrier' },
                    { id: 'milestones', label: 'Jalons 25-100%' },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setZoomScale(mode.id)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                      zoomScale === mode.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Project Milestones Strip (Jalons Clés 25% / 50% / 75% / 100%) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {ganttData.projectMilestones.map((ms) => (
              <div
                key={ms.id}
                className={`p-3 rounded-xl border flex items-start gap-2.5 transition-colors ${
                  ms.reached
                    ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/25'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-mono text-[11px] font-extrabold ${
                    ms.reached
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {ms.pct}%
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-900 dark:text-white truncate text-[11px]">
                      {ms.label}
                    </span>
                    {ms.reached ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <Flag className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                  </div>
                  <p
                    className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5"
                    title={ms.deliverable}
                  >
                    Livrable : {ms.deliverable}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* GANTT Timeline Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/30 dark:bg-slate-950/40">
            <div className="overflow-x-auto">
              <div className="min-w-[980px]">
                {/* Timeline Header Row */}
                <div className="grid grid-cols-12 border-b border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <div className="col-span-5 py-2.5 px-3.5 border-r border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span>Phase, Dépendance, Chef de Lot &amp; Pilotage Direct</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                      Horizon : ~{ganttData.totalDays}j
                    </span>
                  </div>
                  <div className="col-span-7 relative py-2 px-3">
                    <div className="grid grid-cols-5 gap-1">
                      {ganttData.timelineMarkers.slice(0, 5).map((marker, idx) => (
                        <div key={idx} className="text-left">
                          <div className="font-mono font-extrabold text-slate-800 dark:text-slate-200">
                            {marker.label}
                          </div>
                          <div className="text-[9px] font-normal text-slate-500">
                            {marker.subLabel}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Interactive Drag-and-Drop Guide Banner */}
                <div className="px-3.5 py-2 bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-200/70 dark:border-indigo-900/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex flex-wrap items-center gap-2 text-indigo-900 dark:text-indigo-200 font-medium">
                    <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-mono text-[10px] font-bold">
                      GANTT INTERACTIF GLISSER-DÉPOSER
                    </span>
                    <span>
                      <strong>Glisser le centre d’une barre</strong> pour déplacer ses dates ·{' '}
                      <strong>Tirer les poignées gauche/droite</strong> pour ajuster la durée ·{' '}
                      <strong>Glisser le curseur interne %</strong> pour piloter l’avancement en direct.
                    </span>
                  </div>
                  {lastGanttDragNotice && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-bold">
                      ✓ {lastGanttDragNotice}
                    </span>
                  )}
                </div>

                {/* GANTT Phase Rows */}
                <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                  {filteredSteps.map((row) => {
                    const phaseIdx = row.phaseNumber - 1;
                    const isEditingThisPhase = editingPhaseIndex === phaseIdx;
                    const isDraggingThisPhase = dragState?.phaseIndex === phaseIdx;

                    const effectiveStartDay = isDraggingThisPhase
                      ? dragState.previewStartDay
                      : row.startDay;
                    const effectiveDurationDays = isDraggingThisPhase
                      ? dragState.previewDurationDays
                      : row.durationDays;
                    const effectiveProgressPct = isDraggingThisPhase
                      ? dragState.previewProgressPct
                      : row.progressPct;

                    const effectiveStartPct = Math.max(
                      0,
                      Math.min(92, (effectiveStartDay / Math.max(1, ganttData.totalDays)) * 100)
                    );
                    const effectiveWidthPct = Math.max(
                      8,
                      Math.min(
                        100 - effectiveStartPct,
                        (effectiveDurationDays / Math.max(1, ganttData.totalDays)) * 100
                      )
                    );

                    const previewStartDateObj = new Date(
                      ganttData.projectStartTime + effectiveStartDay * 86400000
                    );
                    const previewEndDateObj = new Date(
                      ganttData.projectStartTime +
                        (effectiveStartDay + effectiveDurationDays) * 86400000
                    );
                    const effectiveStartDateFormatted = isDraggingThisPhase
                      ? previewStartDateObj.toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                        })
                      : row.startDateFormatted;
                    const effectiveEndDateFormatted = isDraggingThisPhase
                      ? previewEndDateObj.toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                        })
                      : row.endDateFormatted;

                    const barColor =
                      effectiveProgressPct >= 100
                        ? 'bg-emerald-600 border-emerald-700'
                        : row.isBehindSchedule
                        ? 'bg-rose-600 border-rose-700'
                        : row.isCriticalPath
                        ? 'bg-indigo-600 border-indigo-700'
                        : 'bg-blue-600 border-blue-700';

                    const barTrackBg =
                      effectiveProgressPct >= 100
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800'
                        : row.isBehindSchedule
                        ? 'bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800'
                        : 'bg-indigo-100 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800';

                    return (
                      <div
                        key={row.phaseNumber}
                        className={`grid grid-cols-12 items-center transition-colors ${
                          isDraggingThisPhase
                            ? 'bg-indigo-100/60 dark:bg-indigo-950/50 ring-1 ring-indigo-500'
                            : 'hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20'
                        }`}
                      >
                        {/* Left Column: Phase, Trade, Dependencies & Interactive Controls */}
                        <div className="col-span-5 py-3 px-3.5 border-r border-slate-200 dark:border-slate-800 space-y-2">
                          {isEditingThisPhase ? (
                            <div className="space-y-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-indigo-300 dark:border-indigo-700">
                              <input
                                type="text"
                                value={editPhaseTitle}
                                onChange={(e) => setEditPhaseTitle(e.target.value)}
                                placeholder="Intitulé de la phase"
                                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 font-bold text-slate-900 dark:text-white"
                              />
                              <div className="grid grid-cols-2 gap-1.5">
                                <input
                                  type="text"
                                  value={editPhaseTrade}
                                  onChange={(e) => setEditPhaseTrade(e.target.value)}
                                  placeholder="Corps de métier"
                                  className="rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1"
                                />
                                <input
                                  type="text"
                                  value={editPhaseLeader}
                                  onChange={(e) => setEditPhaseLeader(e.target.value)}
                                  placeholder="Chef de Corps de Métier"
                                  className="rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1"
                                />
                                <input
                                  type="text"
                                  value={editPhaseDuration}
                                  onChange={(e) => setEditPhaseDuration(e.target.value)}
                                  placeholder="Durée (ex: 15 jours)"
                                  className="rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 font-mono"
                                />
                                <input
                                  type="text"
                                  value={editPhaseDeliverable}
                                  onChange={(e) => setEditPhaseDeliverable(e.target.value)}
                                  placeholder="Livrable"
                                  className="rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1"
                                />
                              </div>
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingPhaseIndex(null)}
                                  className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-slate-600"
                                >
                                  Annuler
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveInlinePhaseEdit(phaseIdx)}
                                  className="px-2.5 py-0.5 rounded bg-indigo-600 text-white font-bold cursor-pointer"
                                >
                                  Enregistrer
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                  <span
                                    className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-extrabold shrink-0 ${
                                      effectiveProgressPct >= 100
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                        : row.isBehindSchedule
                                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                        : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                    }`}
                                  >
                                    P{row.phaseNumber}
                                  </span>
                                  {row.isCriticalPath && (
                                    <span
                                      className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400"
                                      title="Phase située sur le Chemin Critique (Marge libre = 0j)"
                                    >
                                      [CPM]
                                    </span>
                                  )}
                                  <span
                                    className="font-bold text-slate-900 dark:text-white truncate max-w-[230px]"
                                    title={row.title}
                                  >
                                    {row.title}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {onUpdateProject && (
                                    <div className="inline-flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded p-0.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleUpdatePhaseProgress(phaseIdx, effectiveProgressPct - 10)
                                        }
                                        className="px-1.5 py-0.5 rounded hover:bg-white dark:hover:bg-slate-700 font-mono text-[10px] font-bold cursor-pointer"
                                        title="Réduire de 10%"
                                      >
                                        -10
                                      </button>
                                      <span className="font-mono font-extrabold text-[11px] px-1 text-indigo-600 dark:text-indigo-400 tabular-nums">
                                        {effectiveProgressPct}%
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleUpdatePhaseProgress(phaseIdx, effectiveProgressPct + 10)
                                        }
                                        className="px-1.5 py-0.5 rounded hover:bg-white dark:hover:bg-slate-700 font-mono text-[10px] font-bold cursor-pointer"
                                        title="Augmenter de 10%"
                                      >
                                        +10
                                      </button>
                                      {effectiveProgressPct < 100 && (
                                        <button
                                          type="button"
                                          onClick={() => handleUpdatePhaseProgress(phaseIdx, 100)}
                                          className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-mono text-[9px] font-bold cursor-pointer"
                                          title="Marquer la phase à 100%"
                                        >
                                          100%
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  {onUpdateProject && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingPhaseIndex(phaseIdx);
                                        setEditPhaseTitle(row.title);
                                        setEditPhaseTrade(row.tradeName);
                                        setEditPhaseLeader(row.tradeLeaderName);
                                        setEditPhaseDuration(`${effectiveDurationDays} jours`);
                                        setEditPhaseDeliverable(row.deliverable);
                                      }}
                                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 cursor-pointer"
                                      title="Modifier cette phase directement"
                                    >
                                      <FileEdit className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400">
                                <span className="inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-300">
                                  <Layers className="w-3 h-3 shrink-0" />
                                  <span className="truncate max-w-[140px]">{row.tradeName}</span>
                                </span>
                                <span>·</span>
                                <span
                                  className="inline-flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-300"
                                  title={`Chef de Corps de Métier : ${row.tradeLeaderName}`}
                                >
                                  <UserCheck className="w-3 h-3 shrink-0" />
                                  <span className="truncate max-w-[140px]">
                                    {row.tradeLeaderName}
                                  </span>
                                </span>
                                {row.dependsOnPhase && (
                                  <>
                                    <span>·</span>
                                    <span
                                      className="font-mono text-slate-500 inline-flex items-center gap-0.5"
                                      title={`Dépendance Fin-à-Début avec la Phase P${row.dependsOnPhase}`}
                                    >
                                      <GitBranch className="w-2.5 h-2.5" />
                                      FS:P{row.dependsOnPhase}
                                    </span>
                                  </>
                                )}
                                <span className="text-slate-500 font-mono inline-flex items-center gap-0.5 ml-auto">
                                  <Clock className="w-3 h-3" />
                                  {effectiveDurationDays} jours
                                </span>
                              </div>

                              {/* Direct Date & Progress Quick Controls */}
                              {onUpdateProject && (
                                <div className="pt-1 flex flex-wrap items-center gap-2 text-[10px]">
                                  <label className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-mono">
                                    <span>Du</span>
                                    <input
                                      type="date"
                                      value={row.startDateIso}
                                      onChange={(e) => {
                                        const newStartStr = e.target.value;
                                        if (!newStartStr) return;
                                        const newStartMs = new Date(`${newStartStr}T00:00:00`).getTime();
                                        if (!Number.isFinite(newStartMs)) return;
                                        const nextOffsetDays = Math.max(
                                          0,
                                          Math.round((newStartMs - ganttData.projectStartTime) / 86400000)
                                        );
                                        handleUpdatePhaseScheduleAndProgress(
                                          phaseIdx,
                                          nextOffsetDays,
                                          effectiveDurationDays,
                                          effectiveProgressPct,
                                          newStartStr
                                        );
                                      }}
                                      className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-0.5 text-[10px] font-mono text-slate-800 dark:text-slate-200"
                                    />
                                  </label>
                                  <label className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-mono">
                                    <span>Au</span>
                                    <input
                                      type="date"
                                      value={row.endDateIso}
                                      onChange={(e) => {
                                        const newEndStr = e.target.value;
                                        if (!newEndStr) return;
                                        const newEndMs = new Date(`${newEndStr}T00:00:00`).getTime();
                                        const startMs = new Date(`${row.startDateIso}T00:00:00`).getTime();
                                        if (!Number.isFinite(newEndMs) || !Number.isFinite(startMs)) return;
                                        const nextDur = Math.max(
                                          2,
                                          Math.round((newEndMs - startMs) / 86400000)
                                        );
                                        handleUpdatePhaseScheduleAndProgress(
                                          phaseIdx,
                                          effectiveStartDay,
                                          nextDur,
                                          effectiveProgressPct,
                                          row.startDateIso,
                                          newEndStr
                                        );
                                      }}
                                      className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-0.5 text-[10px] font-mono text-slate-800 dark:text-slate-200"
                                    />
                                  </label>
                                  <div className="inline-flex items-center gap-1.5 ml-auto">
                                    <span className="text-slate-400 font-mono text-[9px]">Glisser %</span>
                                    <input
                                      type="range"
                                      min={0}
                                      max={100}
                                      step={5}
                                      value={effectiveProgressPct}
                                      onChange={(e) =>
                                        handleUpdatePhaseProgress(phaseIdx, Number(e.target.value))
                                      }
                                      className="w-16 h-1.5 accent-indigo-600 cursor-pointer"
                                      title="Faire glisser pour ajuster la progression de la phase"
                                    />
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Right Column: Interactive Drag-and-Drop Timeline Bar, Today Cursor & Milestone Diamond */}
                        <div className="col-span-7 relative h-full min-h-[78px] py-2.5 px-3 flex items-center select-none">
                          {/* Vertical Milestone Guide Lines (25%, 50%, 75%, 95%) */}
                          {[25, 50, 75, 95].map((pctLine) => (
                            <div
                              key={pctLine}
                              className="absolute top-0 bottom-0 border-l border-dashed border-slate-200 dark:border-slate-800 pointer-events-none"
                              style={{ left: `${pctLine}%` }}
                            />
                          ))}

                          {/* Vertical "Today (J-0)" Reference Line */}
                          <div
                            className="absolute top-0 bottom-0 border-l-2 border-rose-500/75 z-20 pointer-events-none"
                            style={{ left: `${ganttData.todayPct}%` }}
                            title={`Curseur Aujourd'hui (J-0) : ${ganttData.expectedTimeProgressPct}% du délai écoulé`}
                          />

                          <div
                            className="relative w-full h-10 flex items-center"
                            data-gantt-track="true"
                          >
                            {/* Dependency Connector Arrow from previous phase */}
                            {row.dependsOnPhase && effectiveStartPct > 3 && (
                              <div
                                className="absolute h-0.5 bg-indigo-400/60 dark:bg-indigo-500/50 pointer-events-none flex items-center justify-end"
                                style={{
                                  left: `${Math.max(0, effectiveStartPct - 4)}%`,
                                  width: '4%',
                                }}
                              >
                                <ArrowRight className="w-2.5 h-2.5 text-indigo-500 -mr-1" />
                              </div>
                            )}

                            {/* Positioned Interactive Drag-and-Drop GANTT Bar */}
                            <div
                              onPointerDown={(e) => {
                                if (!onUpdateProject) return;
                                const trackEl = e.currentTarget.parentElement;
                                const trackWidthPx = trackEl?.getBoundingClientRect().width || 500;
                                setDragState({
                                  phaseIndex: phaseIdx,
                                  mode: 'move',
                                  initialClientX: e.clientX,
                                  trackWidthPx,
                                  initialStartDay: row.startDay,
                                  initialDurationDays: row.durationDays,
                                  initialProgressPct: row.progressPct,
                                  previewStartDay: row.startDay,
                                  previewDurationDays: row.durationDays,
                                  previewProgressPct: row.progressPct,
                                });
                              }}
                              className={`group/bar absolute h-8 rounded-lg border shadow-xs overflow-visible flex items-center ${
                                onUpdateProject ? 'cursor-grab active:cursor-grabbing' : ''
                              } ${
                                isDraggingThisPhase
                                  ? 'ring-2 ring-indigo-500 shadow-md z-30'
                                  : 'transition-all duration-150'
                              } ${barTrackBg}`}
                              style={{
                                left: `${effectiveStartPct}%`,
                                width: `${effectiveWidthPct}%`,
                              }}
                              title={`Glisser pour déplacer les dates | Phase ${row.phaseNumber}: ${row.title} | ${effectiveStartDateFormatted} → ${effectiveEndDateFormatted} (${effectiveDurationDays}j) | Avancement: ${effectiveProgressPct}%`}
                            >
                              {/* Left Resize Handle (Change Start Date & Duration) */}
                              {onUpdateProject && (
                                <div
                                  onPointerDown={(e) => {
                                    e.stopPropagation();
                                    const trackEl =
                                      e.currentTarget.parentElement?.parentElement;
                                    const trackWidthPx =
                                      trackEl?.getBoundingClientRect().width || 500;
                                    setDragState({
                                      phaseIndex: phaseIdx,
                                      mode: 'resize_left',
                                      initialClientX: e.clientX,
                                      trackWidthPx,
                                      initialStartDay: row.startDay,
                                      initialDurationDays: row.durationDays,
                                      initialProgressPct: row.progressPct,
                                      previewStartDay: row.startDay,
                                      previewDurationDays: row.durationDays,
                                      previewProgressPct: row.progressPct,
                                    });
                                  }}
                                  className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize z-20 flex items-center justify-center rounded-l-lg bg-slate-900/15 hover:bg-indigo-600/80 transition-colors"
                                  title="Tirer vers la gauche ou la droite pour modifier la date de début"
                                >
                                  <span className="w-0.5 h-3.5 bg-white/80 rounded-full" />
                                </div>
                              )}

                              {/* Inner progress fill */}
                              <div
                                className={`h-full rounded-l-lg opacity-90 ${barColor} ${
                                  effectiveProgressPct >= 100 ? 'rounded-r-lg' : ''
                                }`}
                                style={{ width: `${effectiveProgressPct}%` }}
                              />

                              {/* Interactive Draggable Progress Thumb Inside Bar */}
                              {onUpdateProject && (
                                <div
                                  onPointerDown={(e) => {
                                    e.stopPropagation();
                                    const trackEl =
                                      e.currentTarget.parentElement?.parentElement;
                                    const trackWidthPx =
                                      trackEl?.getBoundingClientRect().width || 500;
                                    setDragState({
                                      phaseIndex: phaseIdx,
                                      mode: 'progress',
                                      initialClientX: e.clientX,
                                      trackWidthPx,
                                      initialStartDay: row.startDay,
                                      initialDurationDays: row.durationDays,
                                      initialProgressPct: row.progressPct,
                                      previewStartDay: row.startDay,
                                      previewDurationDays: row.durationDays,
                                      previewProgressPct: row.progressPct,
                                    });
                                  }}
                                  style={{
                                    left: `calc(${Math.max(4, Math.min(96, effectiveProgressPct))}% - 7px)`,
                                  }}
                                  className="absolute -top-1.5 -bottom-1.5 w-3.5 cursor-ew-resize z-30 flex items-center justify-center group/prog"
                                  title={`Glisser horizontalement pour ajuster la progression (${effectiveProgressPct}%)`}
                                >
                                  <span className="w-3 h-5 rounded bg-white dark:bg-slate-900 border-2 border-indigo-600 dark:border-indigo-400 shadow-sm flex items-center justify-center text-[7px] font-mono font-extrabold text-indigo-700 dark:text-indigo-300 group-hover/prog:scale-110 transition-transform">
                                    %
                                  </span>
                                </div>
                              )}

                              {/* Bar Label Overlay */}
                              <div className="absolute inset-0 px-3 flex items-center justify-between gap-1 text-[10px] font-bold pointer-events-none overflow-hidden">
                                <span
                                  className={`truncate ${
                                    effectiveProgressPct > 45
                                      ? 'text-white drop-shadow-2xs'
                                      : 'text-slate-800 dark:text-slate-100'
                                  }`}
                                >
                                  {effectiveStartDateFormatted} → {effectiveEndDateFormatted} ·{' '}
                                  {effectiveDurationDays}j
                                </span>
                                <span
                                  className={`font-mono text-[9px] px-1 rounded tabular-nums ${
                                    effectiveProgressPct > 75
                                      ? 'bg-black/25 text-white'
                                      : 'bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200'
                                  }`}
                                >
                                  {effectiveProgressPct}%
                                </span>
                              </div>

                              {/* Right Resize Handle (Change Duration & End Date) */}
                              {onUpdateProject && (
                                <div
                                  onPointerDown={(e) => {
                                    e.stopPropagation();
                                    const trackEl =
                                      e.currentTarget.parentElement?.parentElement;
                                    const trackWidthPx =
                                      trackEl?.getBoundingClientRect().width || 500;
                                    setDragState({
                                      phaseIndex: phaseIdx,
                                      mode: 'resize_right',
                                      initialClientX: e.clientX,
                                      trackWidthPx,
                                      initialStartDay: row.startDay,
                                      initialDurationDays: row.durationDays,
                                      initialProgressPct: row.progressPct,
                                      previewStartDay: row.startDay,
                                      previewDurationDays: row.durationDays,
                                      previewProgressPct: row.progressPct,
                                    });
                                  }}
                                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize z-20 flex items-center justify-center rounded-r-lg bg-slate-900/15 hover:bg-indigo-600/80 transition-colors"
                                  title="Tirer vers la droite ou la gauche pour ajuster la durée et la date de fin"
                                >
                                  <span className="w-0.5 h-3.5 bg-white/80 rounded-full" />
                                </div>
                              )}

                              {/* Floating Live Tooltip while Dragging */}
                              {isDraggingThisPhase && (
                                <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-bold whitespace-nowrap shadow-lg z-40 pointer-events-none">
                                  {effectiveStartDateFormatted} → {effectiveEndDateFormatted} ({effectiveDurationDays}j) · {effectiveProgressPct}%
                                </div>
                              )}
                            </div>

                            {/* Milestone Deliverable Diamond Marker at the end of the phase bar */}
                            <div
                              className="absolute flex items-center gap-1 z-10 pointer-events-none"
                              style={{
                                left: `calc(${Math.min(
                                  94,
                                  effectiveStartPct + effectiveWidthPct
                                )}% + 4px)`,
                              }}
                            >
                              <span
                                className={`w-3.5 h-3.5 rotate-45 rounded-xs border flex items-center justify-center shadow-2xs ${
                                  effectiveProgressPct >= 100
                                    ? 'bg-emerald-500 border-emerald-700 text-white'
                                    : 'bg-amber-400 border-amber-600 text-slate-950'
                                }`}
                                title={`Jalon Livrable : ${row.deliverable}`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Summary: Legend & Project Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block" />
                <span>Terminé ({completedPhasesCount})</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <span className="w-3 h-3 rounded-xs bg-indigo-600 inline-block" />
                <span>Chemin Critique / En cours ({activePhasesCount})</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <span className="w-3 h-3 rounded-xs bg-rose-600 inline-block" />
                <span>En retard vs J-0 ({ganttData.behindScheduleCount})</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <span className="w-0.5 h-3.5 bg-rose-500 inline-block" />
                <span>Curseur Aujourd&apos;hui (J-0 : {ganttData.expectedTimeProgressPct}%)</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
              <span>
                Responsable :{' '}
                <strong className="font-sans text-slate-900 dark:text-white">
                  {activeProject.projectManagerName || 'Direction de Projet'}
                </strong>
              </span>
              <span>
                Budget :{' '}
                <strong className="text-slate-900 dark:text-white">
                  {formatCurrency(activeProject.budget, activeProject.currency || currency)}
                </strong>
              </span>
              <span>
                Échéance :{' '}
                <strong className="text-indigo-600 dark:text-indigo-400">
                  {activeProject.dueDate}
                </strong>
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
