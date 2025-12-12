/**
 * RBAC Permissions Tests
 * Tests for the two-tier RBAC permission system
 * (System Role + Project Role = Most Restrictive Approach)
 */

import {
  mergeRolePermissions,
  hasPermission,
  getMergedPermissions,
  getVisibleMenus,
  isMenuVisible,
  getAccessibleData,
  canAccessProjectResource,
  ALL_PERMISSIONS,
  ALL_MENUS
} from '@/lib/permissions'

describe('RBAC Permissions System', () => {
  describe('mergeRolePermissions', () => {
    it('should merge permissions with most restrictive approach (both must be true)', () => {
      const systemRole = {
        permissions: {
          voirTousProjets: true,
          creerProjet: true,
          gererTaches: false
        },
        visibleMenus: {
          projects: true,
          kanban: true,
          admin: false
        }
      }

      const projectRole = {
        permissions: {
          voirTousProjets: true,
          creerProjet: false, // System: true, Project: false → Result: false
          gererTaches: false
        },
        visibleMenus: {
          projects: true,
          kanban: false, // System: true, Project: false → Result: false
          admin: false
        }
      }

      const result = mergeRolePermissions(systemRole, projectRole)

      // Both true → true
      expect(result.permissions.voirTousProjets).toBe(true)
      // One false → false
      expect(result.permissions.creerProjet).toBe(false)
      // Both false → false
      expect(result.permissions.gererTaches).toBe(false)
      
      // Menu: both true → true
      expect(result.visibleMenus.projects).toBe(true)
      // Menu: one false → false
      expect(result.visibleMenus.kanban).toBe(false)
    })

    it('should handle undefined/null projectRole as fallback to systemRole', () => {
      const systemRole = {
        permissions: {
          voirTousProjets: true,
          creerProjet: true,
          gererTaches: false
        },
        visibleMenus: {
          projects: true,
          admin: false
        }
      }

      const result = mergeRolePermissions(systemRole, null)

      // Should use system role permissions directly
      expect(result.permissions.voirTousProjets).toBe(true)
      expect(result.permissions.creerProjet).toBe(true)
      expect(result.permissions.gererTaches).toBe(false)
      expect(result.visibleMenus.projects).toBe(true)
    })

    it('should handle explicit false values (not undefined)', () => {
      const systemRole = {
        permissions: { voirTousProjets: false },
        visibleMenus: { projects: false }
      }

      const projectRole = {
        permissions: { voirTousProjets: true },
        visibleMenus: { projects: true }
      }

      const result = mergeRolePermissions(systemRole, projectRole)

      // System: false → Result: false (even if project is true)
      expect(result.permissions.voirTousProjets).toBe(false)
      expect(result.visibleMenus.projects).toBe(false)
    })

    it('should merge all permissions defined in ALL_PERMISSIONS', () => {
      const systemRole = {
        permissions: ALL_PERMISSIONS.reduce((acc, perm) => {
          acc[perm] = true
          return acc
        }, {}),
        visibleMenus: ALL_MENUS.reduce((acc, menu) => {
          acc[menu] = true
          return acc
        }, {})
      }

      const projectRole = {
        permissions: ALL_PERMISSIONS.reduce((acc, perm) => {
          acc[perm] = true
          return acc
        }, {}),
        visibleMenus: ALL_MENUS.reduce((acc, menu) => {
          acc[menu] = true
          return acc
        }, {})
      }

      const result = mergeRolePermissions(systemRole, projectRole)

      // All should be true since both allow
      ALL_PERMISSIONS.forEach(perm => {
        expect(result.permissions[perm]).toBe(true)
      })

      ALL_MENUS.forEach(menu => {
        expect(result.visibleMenus[menu]).toBe(true)
      })
    })
  })

  describe('hasPermission', () => {
    const mockUser = {
      _id: 'user-123',
      role_id: {
        permissions: {
          voirTousProjets: true,
          creerProjet: true,
          gererTaches: false,
          modifierBudget: false
        }
      }
    }

    it('should return true if system role allows permission', () => {
      const result = hasPermission(mockUser, 'voirTousProjets')
      expect(result).toBe(true)
    })

    it('should return false if system role denies permission', () => {
      const result = hasPermission(mockUser, 'gererTaches')
      expect(result).toBe(false)
    })

    it('should return false if user has no role_id', () => {
      const userWithoutRole = { _id: 'user-456' }
      const result = hasPermission(userWithoutRole, 'voirTousProjets')
      expect(result).toBe(false)
    })

    it('should return false if user is null', () => {
      const result = hasPermission(null, 'voirTousProjets')
      expect(result).toBe(false)
    })

    it('should respect most restrictive approach with projectRole', () => {
      const projectRole = {
        permissions: {
          voirTousProjets: false, // Project denies → Result: false
          creerProjet: true, // Project allows but checking another perm
          gererTaches: true // Both false in system → Result: false
        }
      }

      // System allows, project denies → false
      const result1 = hasPermission(mockUser, 'voirTousProjets', projectRole)
      expect(result1).toBe(false)

      // System denies → false regardless of project
      const result2 = hasPermission(mockUser, 'gererTaches', projectRole)
      expect(result2).toBe(false)
    })

    it('should handle undefined permission as false', () => {
      const result = hasPermission(mockUser, 'undefinedPermission')
      expect(result).toBe(false)
    })
  })

  describe('getMergedPermissions', () => {
    const mockUser = {
      _id: 'user-123',
      role_id: {
        permissions: {
          voirTousProjets: true,
          creerProjet: false
        },
        visibleMenus: {
          projects: true,
          admin: false
        }
      }
    }

    it('should return system permissions if no projectRole', () => {
      const result = getMergedPermissions(mockUser, null)

      expect(result.permissions.voirTousProjets).toBe(true)
      expect(result.permissions.creerProjet).toBe(false)
      expect(result.visibleMenus.projects).toBe(true)
      expect(result.visibleMenus.admin).toBe(false)
    })

    it('should merge permissions if projectRole provided', () => {
      const projectRole = {
        permissions: {
          voirTousProjets: false,
          creerProjet: true
        },
        visibleMenus: {
          projects: true,
          admin: true
        }
      }

      const result = getMergedPermissions(mockUser, projectRole)

      // System: true, Project: false → false
      expect(result.permissions.voirTousProjets).toBe(false)
      // System: false → false
      expect(result.permissions.creerProjet).toBe(false)
    })

    it('should return empty permissions if user has no role', () => {
      const userWithoutRole = { _id: 'user-456' }
      const result = getMergedPermissions(userWithoutRole, null)

      expect(result.permissions).toEqual({})
      expect(result.visibleMenus).toEqual({})
    })
  })

  describe('getVisibleMenus', () => {
    const mockUser = {
      _id: 'user-123',
      role_id: {
        permissions: {},
        visibleMenus: {
          projects: true,
          kanban: true,
          admin: false,
          budget: false,
          reports: true
        }
      }
    }

    it('should return array of visible menus', () => {
      const result = getVisibleMenus(mockUser)

      expect(result).toContain('projects')
      expect(result).toContain('kanban')
      expect(result).toContain('reports')
      expect(result).not.toContain('admin')
      expect(result).not.toContain('budget')
    })

    it('should filter menus by projectRole', () => {
      const projectRole = {
        permissions: {},
        visibleMenus: {
          projects: true,
          kanban: false, // Project restricts
          admin: false,
          budget: false,
          reports: true
        }
      }

      const result = getVisibleMenus(mockUser, projectRole)

      expect(result).toContain('projects')
      expect(result).not.toContain('kanban') // Restricted by project
      expect(result).toContain('reports')
    })

    it('should return empty array if user has no role', () => {
      const userWithoutRole = { _id: 'user-456' }
      const result = getVisibleMenus(userWithoutRole)

      expect(result).toEqual([])
    })
  })

  describe('isMenuVisible', () => {
    const mockUser = {
      _id: 'user-123',
      role_id: {
        permissions: {},
        visibleMenus: {
          projects: true,
          kanban: true,
          admin: false
        }
      }
    }

    it('should return true if menu is visible', () => {
      expect(isMenuVisible(mockUser, 'projects')).toBe(true)
      expect(isMenuVisible(mockUser, 'kanban')).toBe(true)
    })

    it('should return false if menu is not visible', () => {
      expect(isMenuVisible(mockUser, 'admin')).toBe(false)
    })

    it('should respect projectRole restrictions', () => {
      const projectRole = {
        permissions: {},
        visibleMenus: {
          projects: false,
          kanban: true,
          admin: false
        }
      }

      // System allows but project denies
      expect(isMenuVisible(mockUser, 'projects', projectRole)).toBe(false)
      // Both allow
      expect(isMenuVisible(mockUser, 'kanban', projectRole)).toBe(true)
    })

    it('should return false if menu undefined in role', () => {
      expect(isMenuVisible(mockUser, 'undefinedMenu')).toBe(false)
    })
  })

  describe('getAccessibleData', () => {
    const mockUser = {
      _id: 'user-123',
      role_id: {
        permissions: {
          voirBudget: true,
          modifierBudget: false,
          voirTempsPasses: true,
          saisirTemps: true,
          genererRapports: false,
          voirAudit: false,
          gererMembresProjet: true,
          changerRoleMembre: false,
          gererTaches: true,
          deplacerTaches: true,
          prioriserBacklog: true,
          gererSprints: false,
          validerLivrable: false,
          commenter: true,
          gererFichiers: true
        }
      }
    }

    it('should return all accessible data types', () => {
      const result = getAccessibleData(mockUser)

      expect(result).toHaveProperty('canViewBudget')
      expect(result).toHaveProperty('canModifyBudget')
      expect(result).toHaveProperty('canViewTimesheets')
      expect(result).toHaveProperty('canSubmitTimesheet')
      expect(result).toHaveProperty('canViewReports')
      expect(result).toHaveProperty('canViewAudit')
      expect(result).toHaveProperty('canManageMembers')
      expect(result).toHaveProperty('canChangeRoles')
      expect(result).toHaveProperty('canManageTasks')
      expect(result).toHaveProperty('canMoveTasks')
      expect(result).toHaveProperty('canPrioritizeBacklog')
      expect(result).toHaveProperty('canManageSprints')
      expect(result).toHaveProperty('canValidateDeliverables')
      expect(result).toHaveProperty('canComment')
      expect(result).toHaveProperty('canManageFiles')
    })

    it('should reflect correct permission values', () => {
      const result = getAccessibleData(mockUser)

      expect(result.canViewBudget).toBe(true)
      expect(result.canModifyBudget).toBe(false)
      expect(result.canViewTimesheets).toBe(true)
      expect(result.canSubmitTimesheet).toBe(true)
      expect(result.canViewReports).toBe(false)
      expect(result.canViewAudit).toBe(false)
      expect(result.canManageMembers).toBe(true)
      expect(result.canChangeRoles).toBe(false)
      expect(result.canManageTasks).toBe(true)
      expect(result.canMoveTasks).toBe(true)
      expect(result.canPrioritizeBacklog).toBe(true)
      expect(result.canManageSprints).toBe(false)
      expect(result.canValidateDeliverables).toBe(false)
      expect(result.canComment).toBe(true)
      expect(result.canManageFiles).toBe(true)
    })

    it('should respect projectRole restrictions', () => {
      const projectRole = {
        permissions: {
          voirBudget: false, // Restrict
          modifierBudget: false,
          voirTempsPasses: true,
          saisirTemps: true,
          genererRapports: false,
          voirAudit: false,
          gererMembresProjet: true,
          changerRoleMembre: false,
          gererTaches: false, // Restrict
          deplacerTaches: true,
          prioriserBacklog: true,
          gererSprints: false,
          validerLivrable: false,
          commenter: true,
          gererFichiers: true
        }
      }

      const result = getAccessibleData(mockUser, projectRole)

      // System allows but project denies
      expect(result.canViewBudget).toBe(false)
      expect(result.canManageTasks).toBe(false)
      // Both allow
      expect(result.canViewTimesheets).toBe(true)
    })
  })

  describe('canAccessProjectResource', () => {
    it('should return false if user has no role', () => {
      const user = { _id: 'user-123' }
      const project = {
        chef_projet: 'user-123',
        product_owner: 'user-456',
        membres: []
      }

      const result = canAccessProjectResource(user, project, 'voirTousProjets')
      expect(result).toBe(false)
    })

    it('should return false if user lacks system permission', () => {
      const user = {
        _id: 'user-123',
        role_id: {
          permissions: { voirTousProjets: false }
        }
      }

      const project = {
        chef_projet: 'user-123',
        product_owner: 'user-456',
        membres: []
      }

      const result = canAccessProjectResource(user, project, 'voirTousProjets')
      expect(result).toBe(false)
    })

    it('should return true if admin', () => {
      const user = {
        _id: 'user-123',
        role_id: {
          permissions: { adminConfig: true }
        }
      }

      const project = {
        chef_projet: 'user-456',
        product_owner: 'user-789',
        membres: []
      }

      const result = canAccessProjectResource(user, project, 'anyPermission')
      expect(result).toBe(true)
    })

    it('should return true if user is project manager', () => {
      const user = {
        _id: 'user-123',
        role_id: {
          permissions: { voirTousProjets: true }
        }
      }

      const project = {
        chef_projet: 'user-123', // User is chef_projet
        product_owner: 'user-456',
        membres: []
      }

      const result = canAccessProjectResource(user, project, 'voirTousProjets')
      expect(result).toBe(true)
    })

    it('should return true if user is product owner', () => {
      const user = {
        _id: 'user-123',
        role_id: {
          permissions: { voirTousProjets: true }
        }
      }

      const project = {
        chef_projet: 'user-456',
        product_owner: 'user-123', // User is product_owner
        membres: []
      }

      const result = canAccessProjectResource(user, project, 'voirTousProjets')
      expect(result).toBe(true)
    })

    it('should return true if user is project member', () => {
      const user = {
        _id: 'user-123',
        role_id: {
          permissions: { voirTousProjets: true }
        }
      }

      const project = {
        chef_projet: 'user-456',
        product_owner: 'user-789',
        membres: [
          { user_id: 'user-123', project_role_id: 'role-1' } // User is member
        ]
      }

      const result = canAccessProjectResource(user, project, 'voirTousProjets')
      expect(result).toBe(true)
    })

    it('should return false if user is not member and not manager/owner', () => {
      const user = {
        _id: 'user-123',
        role_id: {
          permissions: { voirTousProjets: true }
        }
      }

      const project = {
        chef_projet: 'user-456',
        product_owner: 'user-789',
        membres: []
      }

      const result = canAccessProjectResource(user, project, 'voirTousProjets')
      expect(result).toBe(false)
    })
  })

  describe('Permission Constants', () => {
    it('should define all expected permissions', () => {
      expect(ALL_PERMISSIONS).toContain('voirTousProjets')
      expect(ALL_PERMISSIONS).toContain('voirSesProjets')
      expect(ALL_PERMISSIONS).toContain('creerProjet')
      expect(ALL_PERMISSIONS).toContain('supprimerProjet')
      expect(ALL_PERMISSIONS).toContain('modifierCharteProjet')
      expect(ALL_PERMISSIONS).toContain('gererMembresProjet')
      expect(ALL_PERMISSIONS).toContain('changerRoleMembre')
      expect(ALL_PERMISSIONS).toContain('gererTaches')
      expect(ALL_PERMISSIONS).toContain('deplacerTaches')
      expect(ALL_PERMISSIONS).toContain('prioriserBacklog')
      expect(ALL_PERMISSIONS).toContain('gererSprints')
      expect(ALL_PERMISSIONS).toContain('modifierBudget')
      expect(ALL_PERMISSIONS).toContain('voirBudget')
      expect(ALL_PERMISSIONS).toContain('voirTempsPasses')
      expect(ALL_PERMISSIONS).toContain('saisirTemps')
      expect(ALL_PERMISSIONS).toContain('validerLivrable')
      expect(ALL_PERMISSIONS).toContain('gererFichiers')
      expect(ALL_PERMISSIONS).toContain('commenter')
      expect(ALL_PERMISSIONS).toContain('recevoirNotifications')
      expect(ALL_PERMISSIONS).toContain('genererRapports')
      expect(ALL_PERMISSIONS).toContain('voirAudit')
      expect(ALL_PERMISSIONS).toContain('gererUtilisateurs')
      expect(ALL_PERMISSIONS).toContain('adminConfig')
    })

    it('should define all expected menus', () => {
      expect(ALL_MENUS).toContain('portfolio')
      expect(ALL_MENUS).toContain('projects')
      expect(ALL_MENUS).toContain('kanban')
      expect(ALL_MENUS).toContain('backlog')
      expect(ALL_MENUS).toContain('sprints')
      expect(ALL_MENUS).toContain('roadmap')
      expect(ALL_MENUS).toContain('tasks')
      expect(ALL_MENUS).toContain('files')
      expect(ALL_MENUS).toContain('comments')
      expect(ALL_MENUS).toContain('timesheets')
      expect(ALL_MENUS).toContain('budget')
      expect(ALL_MENUS).toContain('reports')
      expect(ALL_MENUS).toContain('notifications')
      expect(ALL_MENUS).toContain('admin')
    })

    it('should have 23 permissions', () => {
      expect(ALL_PERMISSIONS.length).toBe(23)
    })

    it('should have 14 menus', () => {
      expect(ALL_MENUS.length).toBe(14)
    })
  })
})
