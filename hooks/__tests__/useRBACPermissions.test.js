/**
 * useRBACPermissions Hook Tests
 * Tests the React hook for RBAC permission checking in components
 */

import { renderHook } from '@testing-library/react'
import { useRBACPermissions } from '@/hooks/useRBACPermissions'

// Mock the permissions library
jest.mock('@/lib/permissions', () => ({
  getMergedPermissions: jest.fn(),
  isMenuVisible: jest.fn(),
  getAccessibleData: jest.fn(),
  hasPermission: jest.fn()
}))

import {
  getMergedPermissions,
  isMenuVisible,
  getAccessibleData,
  hasPermission as checkPermission
} from '@/lib/permissions'

describe('useRBACPermissions Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('User Shape Normalization', () => {
    it('should handle backend user shape (user.role_id)', () => {
      const user = {
        _id: 'user-123',
        nom_complet: 'John Doe',
        role_id: {
          permissions: { voirTousProjets: true },
          visibleMenus: { projects: true }
        }
      }

      getMergedPermissions.mockReturnValue({
        permissions: { voirTousProjets: true },
        visibleMenus: { projects: true }
      })

      const { result } = renderHook(() => useRBACPermissions(user))

      expect(getMergedPermissions).toHaveBeenCalledWith(
        expect.objectContaining({ role_id: user.role_id }),
        null
      )
      expect(result.current.mergedPermissions).toEqual({
        permissions: { voirTousProjets: true },
        visibleMenus: { projects: true }
      })
    })

    it('should convert frontend user shape (user.role) to backend shape (user.role_id)', () => {
      const user = {
        _id: 'user-123',
        nom_complet: 'Jane Doe',
        role: { // Frontend shape
          permissions: { voirTousProjets: true },
          visibleMenus: { projects: true }
        }
      }

      getMergedPermissions.mockReturnValue({
        permissions: { voirTousProjets: true },
        visibleMenus: { projects: true }
      })

      const { result } = renderHook(() => useRBACPermissions(user))

      // Should convert user.role to user.role_id
      expect(getMergedPermissions).toHaveBeenCalledWith(
        expect.objectContaining({
          role_id: user.role
        }),
        null
      )
    })

    it('should handle null user', () => {
      getMergedPermissions.mockReturnValue({
        permissions: {},
        visibleMenus: {}
      })

      const { result } = renderHook(() => useRBACPermissions(null))

      expect(result.current.mergedPermissions).toEqual({
        permissions: {},
        visibleMenus: {}
      })
    })
  })

  describe('mergedPermissions', () => {
    it('should return merged permissions from hook', () => {
      const user = {
        _id: 'user-123',
        role_id: {
          permissions: {
            voirTousProjets: true,
            creerProjet: false,
            gererTaches: true
          }
        }
      }

      const expectedMerged = {
        permissions: {
          voirTousProjets: true,
          creerProjet: false,
          gererTaches: true
        },
        visibleMenus: {
          projects: true,
          kanban: false,
          admin: false
        }
      }

      getMergedPermissions.mockReturnValue(expectedMerged)

      const { result } = renderHook(() => useRBACPermissions(user))

      expect(result.current.mergedPermissions).toEqual(expectedMerged)
    })

    it('should accept projectRole and pass to getMergedPermissions', () => {
      const user = {
        _id: 'user-123',
        role_id: { permissions: {}, visibleMenus: {} }
      }

      const projectRole = {
        permissions: { voirTousProjets: false },
        visibleMenus: { projects: false }
      }

      getMergedPermissions.mockReturnValue({
        permissions: { voirTousProjets: false },
        visibleMenus: { projects: false }
      })

      const { result } = renderHook(() => useRBACPermissions(user, projectRole))

      expect(getMergedPermissions).toHaveBeenCalledWith(
        expect.objectContaining({ role_id: user.role_id }),
        projectRole
      )
    })
  })

  describe('hasPermission function', () => {
    it('should check permission via hook callback', () => {
      const user = {
        _id: 'user-123',
        role_id: { permissions: { voirTousProjets: true } }
      }

      getMergedPermissions.mockReturnValue({
        permissions: { voirTousProjets: true },
        visibleMenus: {}
      })

      checkPermission.mockReturnValue(true)

      const { result } = renderHook(() => useRBACPermissions(user))

      const hasPermissionFn = result.current.hasPermission
      expect(typeof hasPermissionFn).toBe('function')
    })
  })

  describe('canAccessMenus', () => {
    it('should return object with all menu visibility states', () => {
      const user = {
        _id: 'user-123',
        role_id: {
          permissions: {},
          visibleMenus: {
            portfolio: true,
            projects: true,
            kanban: false,
            backlog: true,
            sprints: false,
            roadmap: false,
            tasks: true,
            files: true,
            comments: false,
            timesheets: true,
            budget: false,
            reports: false,
            notifications: true,
            admin: false
          }
        }
      }

      getMergedPermissions.mockReturnValue({
        permissions: {},
        visibleMenus: user.role_id.visibleMenus
      })

      isMenuVisible.mockImplementation((u, menu) =>
        user.role_id.visibleMenus[menu] === true
      )

      const { result } = renderHook(() => useRBACPermissions(user))

      expect(result.current.canAccessMenus).toEqual({
        portfolio: true,
        projects: true,
        kanban: false,
        backlog: true,
        sprints: false,
        roadmap: false,
        tasks: true,
        files: true,
        comments: false,
        timesheets: true,
        budget: false,
        reports: false,
        notifications: true,
        admin: false
      })
    })

    it('should respect projectRole restrictions on menus', () => {
      const user = {
        _id: 'user-123',
        role_id: {
          permissions: {},
          visibleMenus: {
            portfolio: true,
            projects: true,
            kanban: true,
            admin: false
          }
        }
      }

      const projectRole = {
        permissions: {},
        visibleMenus: {
          portfolio: true,
          projects: true,
          kanban: false, // Restricted at project level
          admin: false
        }
      }

      getMergedPermissions.mockReturnValue({
        permissions: {},
        visibleMenus: projectRole.visibleMenus
      })

      isMenuVisible.mockImplementation((u, menu) =>
        projectRole.visibleMenus[menu] === true
      )

      const { result } = renderHook(() => useRBACPermissions(user, projectRole))

      expect(result.current.canAccessMenus.kanban).toBe(false)
      expect(result.current.canAccessMenus.projects).toBe(true)
    })
  })

  describe('accessibleData', () => {
    it('should return all accessible data properties', () => {
      const user = {
        _id: 'user-123',
        role_id: { permissions: {}, visibleMenus: {} }
      }

      const expectedData = {
        canViewBudget: true,
        canModifyBudget: false,
        canViewTimesheets: true,
        canSubmitTimesheet: true,
        canViewReports: false,
        canViewAudit: false,
        canManageMembers: true,
        canChangeRoles: false,
        canManageTasks: true,
        canMoveTasks: true,
        canPrioritizeBacklog: true,
        canManageSprints: false,
        canValidateDeliverables: false,
        canComment: true,
        canManageFiles: true
      }

      getMergedPermissions.mockReturnValue({
        permissions: {},
        visibleMenus: {}
      })

      getAccessibleData.mockReturnValue(expectedData)

      const { result } = renderHook(() => useRBACPermissions(user))

      expect(result.current.accessibleData).toEqual(expectedData)
    })
  })

  describe('Specific Permission Shortcuts', () => {
    it('should provide shortcuts for common permissions', () => {
      const user = {
        _id: 'user-123',
        role_id: {
          permissions: {
            voirBudget: true,
            modifierBudget: false,
            gererMembresProjet: true,
            gererTaches: true,
            deplacerTaches: false
          }
        }
      }

      getMergedPermissions.mockReturnValue({
        permissions: user.role_id.permissions,
        visibleMenus: {}
      })

      checkPermission.mockImplementation((u, perm) =>
        user.role_id.permissions[perm] === true
      )

      const { result } = renderHook(() => useRBACPermissions(user))

      // Check that all expected shortcuts exist
      expect(result.current).toHaveProperty('canViewBudget')
      expect(result.current).toHaveProperty('canModifyBudget')
      expect(result.current).toHaveProperty('canViewTimesheets')
      expect(result.current).toHaveProperty('canSubmitTimesheet')
      expect(result.current).toHaveProperty('canViewReports')
      expect(result.current).toHaveProperty('canViewAudit')
      expect(result.current).toHaveProperty('canManageMembers')
      expect(result.current).toHaveProperty('canChangeRoles')
      expect(result.current).toHaveProperty('canManageTasks')
      expect(result.current).toHaveProperty('canMoveTasks')
      expect(result.current).toHaveProperty('canPrioritizeBacklog')
      expect(result.current).toHaveProperty('canManageSprints')
      expect(result.current).toHaveProperty('canValidateDeliverables')
      expect(result.current).toHaveProperty('canComment')
      expect(result.current).toHaveProperty('canManageFiles')
      expect(result.current).toHaveProperty('canEditProject')
      expect(result.current).toHaveProperty('canCreateProject')
      expect(result.current).toHaveProperty('canDeleteProject')
      expect(result.current).toHaveProperty('canViewAllProjects')
    })

    it('should return correct values for permission shortcuts', () => {
      const user = {
        _id: 'user-123',
        role_id: {
          permissions: {
            voirBudget: true,
            modifierBudget: false,
            creerProjet: true,
            supprimerProjet: false,
            voirTousProjets: true
          }
        }
      }

      getMergedPermissions.mockReturnValue({
        permissions: user.role_id.permissions,
        visibleMenus: {}
      })

      checkPermission.mockImplementation((u, perm) =>
        user.role_id.permissions[perm] === true
      )

      const { result } = renderHook(() => useRBACPermissions(user))

      // These are shortcuts that should call checkPermission
      expect(checkPermission).toHaveBeenCalledWith(
        expect.any(Object),
        'voirBudget',
        null
      )
    })
  })

  describe('Hook reactivity with changing props', () => {
    it('should update when user changes', () => {
      const user1 = {
        _id: 'user-123',
        role_id: { permissions: { voirTousProjets: true } }
      }

      const user2 = {
        _id: 'user-456',
        role_id: { permissions: { voirTousProjets: false } }
      }

      getMergedPermissions
        .mockReturnValueOnce({
          permissions: { voirTousProjets: true },
          visibleMenus: {}
        })
        .mockReturnValueOnce({
          permissions: { voirTousProjets: false },
          visibleMenus: {}
        })

      const { result, rerender } = renderHook(
        ({ user }) => useRBACPermissions(user),
        { initialProps: { user: user1 } }
      )

      expect(result.current.mergedPermissions.permissions.voirTousProjets).toBe(true)

      rerender({ user: user2 })

      expect(result.current.mergedPermissions.permissions.voirTousProjets).toBe(false)
    })

    it('should update when projectRole changes', () => {
      const user = {
        _id: 'user-123',
        role_id: { permissions: { voirTousProjets: true } }
      }

      const projectRole1 = {
        permissions: { voirTousProjets: true }
      }

      const projectRole2 = {
        permissions: { voirTousProjets: false }
      }

      getMergedPermissions
        .mockReturnValueOnce({
          permissions: { voirTousProjets: true },
          visibleMenus: {}
        })
        .mockReturnValueOnce({
          permissions: { voirTousProjets: false },
          visibleMenus: {}
        })

      const { result, rerender } = renderHook(
        ({ projectRole }) => useRBACPermissions(user, projectRole),
        { initialProps: { projectRole: projectRole1 } }
      )

      expect(result.current.mergedPermissions.permissions.voirTousProjets).toBe(true)

      rerender({ projectRole: projectRole2 })

      expect(result.current.mergedPermissions.permissions.voirTousProjets).toBe(false)
    })
  })

  describe('Integration with multiple permissions', () => {
    it('should handle complex permission scenarios', () => {
      const user = {
        _id: 'user-123',
        role_id: {
          permissions: {
            voirTousProjets: true,
            creerProjet: true,
            supprimerProjet: false,
            gererTaches: true,
            deplacerTaches: true,
            gererSprints: true,
            gererMembresProjet: true,
            changerRoleMembre: false,
            voirBudget: true,
            modifierBudget: true,
            genererRapports: true,
            voirAudit: false,
            gererUtilisateurs: false,
            adminConfig: false
          },
          visibleMenus: {
            portfolio: true,
            projects: true,
            kanban: true,
            backlog: true,
            sprints: true,
            roadmap: true,
            tasks: true,
            files: true,
            comments: true,
            timesheets: true,
            budget: true,
            reports: true,
            notifications: true,
            admin: false
          }
        }
      }

      getMergedPermissions.mockReturnValue({
        permissions: user.role_id.permissions,
        visibleMenus: user.role_id.visibleMenus
      })

      getAccessibleData.mockReturnValue({
        canViewBudget: true,
        canModifyBudget: true,
        canManageTasks: true,
        canViewReports: true,
        canManageMembers: true,
        canChangeRoles: false
      })

      const { result } = renderHook(() => useRBACPermissions(user))

      // Verify hook returns complete state
      expect(result.current.mergedPermissions).toBeDefined()
      expect(result.current.canAccessMenus).toBeDefined()
      expect(result.current.accessibleData).toBeDefined()
      expect(result.current.hasPermission).toBeDefined()
    })
  })
})
