import {
  ExportableProjectClosure,
  ProjectCompletionSummaryRecord,
  ProjectCycleObjective,
  ProjectExecutionStep,
} from './exporters';
import { ProjectExploitationType } from '../components/ErpModules';

export interface ProjectSchedulePayload {
  tenantId?: string;
  projectType?: ProjectExploitationType;
  sectorActivity?: string;
  involvedTrades?: string[];
  projectManagerName?: string;
  duration?: string;
  processesAndMethods?: string;
  equipmentNeeded?: string;
  materialsNeeded?: string;
  requiredPersonnel?: string;
  qualityAndSafetyNorms?: string;
  deliverables?: string;
  dedicatedAccountType?: 'Compte Bancaire' | 'Mobile Money';
  dedicatedAccountProvider?: string;
  dedicatedAccountNumber?: string;
  structuredSteps?: ProjectExecutionStep[];
  objectives?: Array<{
    id: string;
    cycleType: 'Mensuel' | 'Hebdomadaire' | 'Journalier' | 'Fin de phase';
    periodLabel: string;
    title: string;
    targetPct: number;
    achievedPct: number;
    status: 'pending' | 'achieved' | 'in_progress' | 'delayed';
    evaluationNotes?: string;
    evaluatedAt?: string;
    evaluatedBy?: string;
  }>;
  cycleObjectives?: ProjectCycleObjective[];
  closureInfo?: ExportableProjectClosure;
  isLocked?: boolean;
  lockedAt?: string;
  lockedBy?: string;
  achievementCategory?: 'in_progress' | 'completed_with_success';
  completionSummaryDoc?: ProjectCompletionSummaryRecord;
}

export function encodeProjectScheduleData(payload: ProjectSchedulePayload): string {
  try {
    return JSON.stringify(payload).slice(0, 19950);
  } catch {
    return '';
  }
}

export function decodeProjectScheduleData(raw?: string): ProjectSchedulePayload {
  if (!raw || typeof raw !== 'string') return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export interface CollaboratorPresence {
  sessionId: string;
  tenantId: string;
  userName: string;
  userRole: string;
  userEmail: string;
  activeView: string;
  editingTarget?: {
    type: 'document' | 'schedule';
    id: string;
    label: string;
  } | null;
  lastSeenAt: number;
}

export interface RealtimeActivityEvent {
  id: string;
  tenantId?: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  entityType?: 'project_schedule' | 'document' | 'email_alert';
  entityId?: string;
  entityLabel?: string;
  actionLabel?: string;
  details?: string;
  targetType?: 'document' | 'schedule' | 'milestone' | 'email_alert';
  targetId?: string;
  targetLabel?: string;
  summary?: string;
}
