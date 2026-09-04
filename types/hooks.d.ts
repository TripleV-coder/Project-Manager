import { IPermissions, IVisibleMenus, PermissionKey, MenuKey, IRole, IProjectRole } from './models';

// =============================================================================
// useAuthFetch
// =============================================================================

export interface UseAuthFetchReturn {
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

// =============================================================================
// useRBACPermissions
// =============================================================================

/** Merged permissions result from system role + project role */
export interface MergedPermissions {
  permissions: Partial<IPermissions>;
  visibleMenus: Partial<IVisibleMenus>;
}

/** Menu access flags */
export interface MenuAccessMap {
  portfolio: boolean;
  projects: boolean;
  kanban: boolean;
  backlog: boolean;
  sprints: boolean;
  roadmap: boolean;
  tasks: boolean;
  files: boolean;
  comments: boolean;
  timesheets: boolean;
  budget: boolean;
  reports: boolean;
  notifications: boolean;
  admin: boolean;
}

/** Accessible data flags from getAccessibleData */
export interface AccessibleData {
  canViewBudget: boolean;
  canModifyBudget: boolean;
  canViewTimesheets: boolean;
  canSubmitTimesheet: boolean;
  canViewReports: boolean;
  canViewAudit: boolean;
  canManageMembers: boolean;
  canChangeRoles: boolean;
  canManageTasks: boolean;
  canMoveTasks: boolean;
  canPrioritizeBacklog: boolean;
  canManageSprints: boolean;
  canValidateDeliverables: boolean;
  canComment: boolean;
  canManageFiles: boolean;
}

/** Specific permission checks */
export interface SpecificPermissions extends AccessibleData {
  canEditProject: boolean;
  canCreateProject: boolean;
  canDeleteProject: boolean;
  canViewAllProjects: boolean;
}

export interface UseRBACPermissionsReturn extends SpecificPermissions {
  mergedPermissions: MergedPermissions;
  hasPermission: (permission: PermissionKey) => boolean;
  canAccessMenus: MenuAccessMap;
  accessibleData: AccessibleData;
}

/** User shape accepted by useRBACPermissions (handles both frontend and backend shapes) */
export interface RBACUser {
  _id?: string;
  role_id?: IRole | { permissions?: Partial<IPermissions>; visibleMenus?: Partial<IVisibleMenus> };
  role?: IRole | { permissions?: Partial<IPermissions>; visibleMenus?: Partial<IVisibleMenus> };
}

// =============================================================================
// useConfirmation
// =============================================================================

export interface ConfirmOptions {
  title?: string;
  description?: string;
  actionLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
}

export interface UseConfirmationReturn {
  confirm: (options?: ConfirmOptions) => Promise<boolean>;
}

// =============================================================================
// useTaskSync
// =============================================================================

export interface TaskSyncCallbacks {
  onTaskCreated?: (data: any) => void;
  onTaskUpdated?: (data: any) => void;
  onTaskDeleted?: (data: any) => void;
  onTaskMoved?: (data: any) => void;
}

// =============================================================================
// useNotificationSync
// =============================================================================

export interface NotificationSyncCallbacks {
  onNotificationCreated?: (data: any) => void;
  onNotificationRead?: (data: any) => void;
}

// =============================================================================
// useCommentSync
// =============================================================================

export interface CommentSyncCallbacks {
  onCommentCreated?: (data: any) => void;
  onCommentUpdated?: (data: any) => void;
  onCommentDeleted?: (data: any) => void;
}

// =============================================================================
// useToast (use-toast.js)
// =============================================================================

export type ToastVariant = 'default' | 'destructive';

export interface ToastProps {
  id?: string;
  title?: string;
  description?: string;
  action?: React.ReactElement;
  variant?: ToastVariant;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface ToastState {
  toasts: ToastProps[];
}

export interface ToastReturn {
  id: string;
  dismiss: () => void;
  update: (props: Partial<ToastProps>) => void;
}

export interface UseToastReturn extends ToastState {
  toast: (props: Omit<ToastProps, 'id' | 'open' | 'onOpenChange'>) => ToastReturn;
  dismiss: (toastId?: string) => void;
}

// =============================================================================
// useItemFormData
// =============================================================================

export interface UseItemFormDataOptions {
  projectId?: string | null;
  loadProjects?: boolean;
  loadUsers?: boolean;
  loadSprints?: boolean;
  loadDeliverables?: boolean;
  onUnauthorized?: () => void;
}

export interface FormDataErrors {
  projects: string | null;
  users: string | null;
  sprints: string | null;
  deliverables: string | null;
  items: string | null;
}

export interface UseItemFormDataReturn {
  // Data
  projects: any[];
  users: any[];
  sprints: any[];
  deliverables: any[];
  epics: any[];
  stories: any[];

  // Loading states
  loading: boolean;
  loadingProjects: boolean;
  loadingUsers: boolean;
  loadingSprints: boolean;
  loadingDeliverables: boolean;
  loadingItems: boolean;

  // Error states
  errors: FormDataErrors;
  hasErrors: boolean;

  // Ready state
  dataReady: boolean;

  // Actions
  refresh: () => void;
  reloadProjectData: (newProjectId: string) => Promise<void>;
  fetchEpicsAndStories: (filterProjectId: string) => Promise<{ epics: any[]; stories: any[] }>;
}

// =============================================================================
// useOptimizedQuery
// =============================================================================

export interface UseOptimizedQueryOptions {
  cacheTime?: number;
  retry?: number;
  retryDelay?: number;
  debounce?: number;
  enabled?: boolean;
}

export interface UseOptimizedQueryReturn<T = any> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<T>;
  fetch: (params?: Record<string, any>) => Promise<T>;
}

// =============================================================================
// usePushNotifications
// =============================================================================

export interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  subscription: PushSubscription | null;
  permission: NotificationPermission;
  loading: boolean;
  error: string | null;
  subscribe: () => Promise<PushSubscription | null>;
  unsubscribe: () => Promise<boolean>;
  registerServiceWorker: () => Promise<ServiceWorkerRegistration | null>;
}

// =============================================================================
// useRealtime
// =============================================================================

export interface UseRealtimeOptions {
  showErrorToast?: boolean;
  errorMessage?: string;
  retryOnError?: boolean;
  maxRetries?: number;
}

export interface UseRealtimeReturn<T = any> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isConnected: boolean;
  subscribe: () => (() => void) | undefined;
  unsubscribe: () => void;
}

export interface UseRealtimeEmitReturn {
  emit: (eventName: string, data?: any, timeout?: number) => Promise<any>;
  loading: boolean;
  error: Error | null;
  isConnected: boolean;
}

export interface UseRealtimeMultiReturn {
  error: Error | null;
  unsubscribe: () => void;
}

// =============================================================================
// useSocketListener
// =============================================================================

export type SocketEventName = string | string[];
