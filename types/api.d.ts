import { NextResponse } from 'next/server';

// =============================================================================
// API Response Types
// =============================================================================

/** Standard API error object */
export interface ApiError {
  message: string;
  code: string;
  details?: any;
}

/** Standard API success response */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  pagination?: PaginationMeta;
}

/** Standard API error response */
export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

/** Combined API response type */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/** Pagination metadata returned in responses */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// =============================================================================
// API Request Types
// =============================================================================

/** Common pagination query parameters */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
}

/** Search/filter params for projects */
export interface ProjectQueryParams extends PaginationParams {
  statut?: 'Planification' | 'En cours' | 'En pause' | 'Terminé' | 'Annulé';
  priorite?: 'Basse' | 'Moyenne' | 'Haute' | 'Critique';
  chef_projet?: string;
  archive?: boolean;
}

/** Search/filter params for tasks */
export interface TaskQueryParams extends PaginationParams {
  projet_id?: string;
  statut?: 'Backlog' | 'À faire' | 'En cours' | 'Review' | 'Terminé';
  priorite?: 'Basse' | 'Moyenne' | 'Haute' | 'Critique';
  type?: 'Épic' | 'Story' | 'Tâche' | 'Bug';
  assigne_a?: string;
  sprint_id?: string;
}

/** Search/filter params for sprints */
export interface SprintQueryParams extends PaginationParams {
  projet_id?: string;
  statut?: 'Planifié' | 'Actif' | 'Terminé';
}

/** Search/filter params for timesheets */
export interface TimesheetQueryParams extends PaginationParams {
  projet_id?: string;
  utilisateur?: string;
  task_id?: string;
  sprint_id?: string;
  statut?: 'brouillon' | 'soumis' | 'validé' | 'refusé';
  date_start?: string;
  date_end?: string;
}

/** Search/filter params for audit logs */
export interface AuditLogQueryParams extends PaginationParams {
  utilisateur?: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  result?: 'success' | 'failure' | 'partial';
  date_start?: string;
  date_end?: string;
  ip_address?: string;
}

/** Search/filter params for notifications */
export interface NotificationQueryParams extends PaginationParams {
  lu?: boolean;
  type?: string;
  archive?: boolean;
}

// =============================================================================
// APIResponse class type (matches lib/apiResponse.js)
// =============================================================================

export declare class APIResponse {
  static success(
    data: any,
    message?: string | null,
    statusCode?: number,
    pagination?: PaginationMeta | null
  ): NextResponse;
  static error(
    message: string,
    statusCode?: number,
    details?: any,
    errorCode?: string | null
  ): NextResponse;
  static validationError(
    errors: Array<{ field: string; message: string }>,
    statusCode?: number
  ): NextResponse;
  static unauthorized(message?: string): NextResponse;
  static forbidden(message?: string): NextResponse;
  static notFound(message?: string): NextResponse;
  static created(data: any, message?: string): NextResponse;
  static noContent(): NextResponse;
  static withCORS(response: NextResponse, origin?: string): NextResponse;
}

export declare function handleError(error: Error, context?: string): NextResponse;

// =============================================================================
// Auth Types
// =============================================================================

/** JWT payload structure */
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  tokenVersion: number;
  iat: number;
  exp: number;
}

/** Authenticated request user (injected by middleware) */
export interface AuthenticatedUser {
  _id: string;
  email: string;
  nom_complet: string;
  role_id: {
    _id: string;
    nom: string;
    permissions: import('./models').IPermissions;
    visibleMenus: import('./models').IVisibleMenus;
  };
  status: 'Actif' | 'Désactivé' | 'Suspendu';
}

// =============================================================================
// Validation Error Types
// =============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
