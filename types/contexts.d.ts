import { ReactNode } from 'react';

// =============================================================================
// AppSettingsContext
// =============================================================================

export type AppLanguage = 'fr' | 'en';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type CurrencyCode = 'FCFA' | 'EUR' | 'USD' | 'GBP' | 'CAD';

export interface AppSettings {
  appName: string;
  appDescription: string;
  langue: AppLanguage;
  timezone: string;
  devise: CurrencyCode;
  formatDate: DateFormat;
}

export interface FormatDateOptions {
  includeTime?: boolean;
  relative?: boolean;
}

export interface FormatCurrencyOptions {
  compact?: boolean;
}

export type TranslationKey = string;

export interface CurrencySymbolMap {
  FCFA: string;
  EUR: string;
  USD: string;
  GBP: string;
  CAD: string;
}

export interface TranslationMap {
  fr: Record<string, string>;
  en: Record<string, string>;
}

export interface AppSettingsContextValue {
  settings: AppSettings;
  loaded: boolean;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  t: (key: TranslationKey) => string;
  formatDate: (date: Date | string | null, options?: FormatDateOptions) => string;
  formatCurrency: (
    amount: number | string | null | undefined,
    options?: FormatCurrencyOptions
  ) => string;
  getStatusLabel: (statut: string) => string;
  getPriorityLabel: (priorite: string) => string;
  getTimezone: () => string;
  getLanguage: () => AppLanguage;
  currencySymbols: CurrencySymbolMap;
  translations: TranslationMap;
}

/** Return type of useAppSettings() */
export type UseAppSettingsReturn = AppSettingsContextValue;

/** Return type of useTranslation() */
export interface UseTranslationReturn {
  t: (key: TranslationKey) => string;
  language: AppLanguage;
}

/** Return type of useFormatters() */
export interface UseFormattersReturn {
  formatDate: (date: Date | string | null, options?: FormatDateOptions) => string;
  formatCurrency: (
    amount: number | string | null | undefined,
    options?: FormatCurrencyOptions
  ) => string;
  getStatusLabel: (statut: string) => string;
  getPriorityLabel: (priorite: string) => string;
  timezone: string;
}

// =============================================================================
// ThemeContext
// =============================================================================

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  resolvedTheme: ResolvedTheme;
}

/** Return type of useTheme() */
export type UseThemeReturn = ThemeContextValue;

// =============================================================================
// PreferencesContext
// =============================================================================

export interface PreferencesContextValue {
  sidebarCompact: boolean;
  setSidebarCompact: (value: boolean) => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
}

/** Return type of usePreferences() */
export type UsePreferencesReturn = PreferencesContextValue;

// =============================================================================
// ConfirmationContext
// =============================================================================

export interface ConfirmationOptions {
  title?: string;
  description?: string;
  actionLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
}

export interface ConfirmationDialogState extends Required<ConfirmationOptions> {
  onConfirm: () => void;
  onCancel: () => void;
}

export interface ConfirmationContextValue {
  confirm: (options?: ConfirmationOptions) => Promise<boolean>;
}

/** Return type of useConfirmation() */
export type UseConfirmationReturn = ConfirmationContextValue;

// =============================================================================
// SocketContext
// =============================================================================

export type SocketStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'no_token';

export interface SocketStatusConstants {
  IDLE: 'idle';
  CONNECTING: 'connecting';
  CONNECTED: 'connected';
  DISCONNECTED: 'disconnected';
  ERROR: 'error';
  NO_TOKEN: 'no_token';
}

export interface SocketContextValue {
  socket: any;
  isConnected: boolean;
  connectionStatus: SocketStatus;
  connectionError: string | null;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback: (...args: any[]) => void) => void;
  emit: (event: string, data?: any) => void;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  reconnect: () => Promise<void>;
  SOCKET_STATUS: SocketStatusConstants;
}

/** Return type of useSocket() */
export type UseSocketReturn = SocketContextValue;

// =============================================================================
// Socket Events (lib/socket-events.js)
// =============================================================================

export interface SocketEvents {
  // Projects
  PROJECT_CREATED: 'project:created';
  PROJECT_UPDATED: 'project:updated';
  PROJECT_DELETED: 'project:deleted';
  PROJECT_MEMBERS_CHANGED: 'project:members_changed';

  // Tasks
  TASK_CREATED: 'task:created';
  TASK_UPDATED: 'task:updated';
  TASK_DELETED: 'task:deleted';
  TASK_MOVED: 'task:moved';
  TASK_ASSIGNED: 'task:assigned';
  TASK_COMMENTED: 'task:commented';

  // Sprints
  SPRINT_CREATED: 'sprint:created';
  SPRINT_UPDATED: 'sprint:updated';
  SPRINT_STARTED: 'sprint:started';
  SPRINT_COMPLETED: 'sprint:completed';

  // Comments
  COMMENT_CREATED: 'comment:created';
  COMMENT_UPDATED: 'comment:updated';
  COMMENT_DELETED: 'comment:deleted';

  // Notifications
  NOTIFICATION_CREATED: 'notification:created';
  NOTIFICATION_READ: 'notification:read';

  // Timesheets
  TIMESHEET_CREATED: 'timesheet:created';
  TIMESHEET_UPDATED: 'timesheet:updated';

  // Budget
  BUDGET_UPDATED: 'budget:updated';

  // Deliverables
  DELIVERABLE_CREATED: 'deliverable:created';
  DELIVERABLE_UPDATED: 'deliverable:updated';
  DELIVERABLE_VALIDATED: 'deliverable:validated';

  // Files
  FILE_UPLOADED: 'file:uploaded';
  FILE_DELETED: 'file:deleted';

  // User presence
  USER_ONLINE: 'user:online';
  USER_OFFLINE: 'user:offline';
  USER_VIEWING: 'user:viewing';

  // Errors
  ERROR: 'error';
}

export type SocketEventName = SocketEvents[keyof SocketEvents];

// =============================================================================
// Provider Props (all context providers)
// =============================================================================

export interface ProviderProps {
  children: ReactNode;
}
