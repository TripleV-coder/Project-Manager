/**
 * Advanced RBAC Permission Tests
 * Tests for edge cases, security scenarios, and complex permission combinations
 */

import {
  mergeRolePermissions,
  hasPermission,
  getMergedPermissions,
  getVisibleMenus,
  getAccessibleData,
  canAccessProjectResource,
  ALL_PERMISSIONS,
  ALL_MENUS
} from '@/lib/permissions'

describe('Advanced RBAC Permission Tests', () => {
  describe('Security Edge Cases', () => {
    it('should deny access when user has no role_id', () => {
      const userWithoutRole = { _id: 'user-123' }

      expect(hasPermission(userWithoutRole, 'voirTousProjets')).toBe(false)
      expect(hasPermission(userWithoutRole, 'adminConfig')).toBe(false)
      expect(hasPermission(userWithoutRole, 'gererUtilisateurs')).toBe(false)
    })

    it('should deny access when user is null', () => {
      expect(hasPermission(null, 'voirTousProjets')).toBe(false)
      expect(hasPermission(undefined, 'adminConfig')).toBe(false)
    })

    it('should deny access when role_id permissions is undefined', () => {
      const userWithEmptyRole = {
        _id: 'user-123',
        role_id: {}
      }

      expect(hasPermission(userWithEmptyRole, 'voirTousProjets')).toBe(false)
    })

    it('should treat "truthy" non-boolean values as false', () => {
      const userWithInvalidPermissions = {
        _id: 'user-123',
        role_id: {
          permissions: {
            voirTousProjets: 'yes', // String instead of boolean
            adminConfig: 1, // Number instead of boolean
            gererTaches: {} // Object instead of boolean
          }
        }
      }

      // Should be false because permissions must be exactly `true`
      expect(hasPermission(userWithInvalidPermissions, 'voirTousProjets')).toBe(false)
      expect(hasPermission(userWithInvalidPermissions, 'adminConfig')).toBe(false)
      expect(hasPermission(userWithInvalidPermissions, 'gererTaches')).toBe(false)
    })

    it('should handle permissions not in ALL_PERMISSIONS gracefully', () => {
      const user = {
        _id: 'user-123',
        role_id: {
          permissions: {
            voirTousProjets: true,
            fakePermission: true // Not in ALL_PERMISSIONS
          }
        }
      }

      expect(hasPermission(user, 'fakePermission')).toBe(true) // Still checks
      expect(hasPermission(user, 'anotherFakePermission')).toBe(false)
    })
  })

  describe('Permission Escalation Prevention', () => {
    it('should prevent project role from granting more permissions than system role', () => {
      const systemRole = {
        permissions: {
          voirTousProjets: false,
          adminConfig: false,
          gererUtilisateurs: false
        },
        visibleMenus: {
          admin: false
        }
      }

      const projectRole = {
        permissions: {
          voirTousProjets: true, // Attempts escalation
          adminConfig: true, // Attempts escalation
          gererUtilisateurs: true // Attempts escalation
        },
        visibleMenus: {
          admin: true // Attempts escalation
        }
      }

      const merged = mergeRolePermissions(systemRole, projectRole)

      // All should be false because system denies
      expect(merged.permissions.voirTousProjets).toBe(false)
      expect(merged.permissions.adminConfig).toBe(false)
      expect(merged.permissions.gererUtilisateurs).toBe(false)
      expect(merged.visibleMenus.admin).toBe(false)
    })

    it('should enforce most restrictive even with nested role objects', () => {
      const user = {
        _id: 'user-123',
        role_id: {
          nom: 'Limited User',
          permissions: {
            voirTousProjets: true,
            gererTaches: true,
            modifierBudget: false
          }
        }
      }

      const restrictiveProjectRole = {
        permissions: {
          voirTousProjets: false, // Restricts
          gererTaches: false, // Restricts
          modifierBudget: true // Cannot escalate
        }
      }

      const merged = getMergedPermissions(user, restrictiveProjectRole)

      expect(merged.permissions.voirTousProjets).toBe(false)
      expect(merged.permissions.gererTaches).toBe(false)
      expect(merged.permissions.modifierBudget).toBe(false) // Most restrictive
    })
  })

  describe('All 23 Permissions Verification', () => {
    it('should verify exactly 23 permissions are defined', () => {
      expect(ALL_PERMISSIONS).toHaveLength(23)
    })

    it('should verify all 23 permissions have correct names', () => {
      const expectedPermissions = [
        'voirTousProjets',
        'voirSesProjets',
        'creerProjet',
        'supprimerProjet',
        'modifierCharteProjet',
        'gererMembresProjet',
        'changerRoleMembre',
        'gererTaches',
        'deplacerTaches',
        'prioriserBacklog',
        'gererSprints',
        'modifierBudget',
        'voirBudget',
        'voirTempsPasses',
        'saisirTemps',
        'validerLivrable',
        'gererFichiers',
        'commenter',
        'recevoirNotifications',
        'genererRapports',
        'voirAudit',
        'gererUtilisateurs',
        'adminConfig'
      ]

      expect(ALL_PERMISSIONS).toEqual(expectedPermissions)
    })

    it('should properly check each of the 23 permissions', () => {
      const adminUser = {
        _id: 'admin-user',
        role_id: {
          permissions: ALL_PERMISSIONS.reduce((acc, perm) => {
            acc[perm] = true
            return acc
          }, {})
        }
      }

      ALL_PERMISSIONS.forEach(permission => {
        expect(hasPermission(adminUser, permission)).toBe(true)
      })
    })

    it('should deny all 23 permissions when all are false', () => {
      const restrictedUser = {
        _id: 'restricted-user',
        role_id: {
          permissions: ALL_PERMISSIONS.reduce((acc, perm) => {
            acc[perm] = false
            return acc
          }, {})
        }
      }

      ALL_PERMISSIONS.forEach(permission => {
        expect(hasPermission(restrictedUser, permission)).toBe(false)
      })
    })
  })

  describe('All 14 Menus Verification', () => {
    it('should verify exactly 14 menus are defined', () => {
      expect(ALL_MENUS).toHaveLength(14)
    })

    it('should verify all 14 menus have correct names', () => {
      const expectedMenus = [
        'portfolio',
        'projects',
        'kanban',
        'backlog',
        'sprints',
        'roadmap',
        'tasks',
        'files',
        'comments',
        'timesheets',
        'budget',
        'reports',
        'notifications',
        'admin'
      ]

      expect(ALL_MENUS).toEqual(expectedMenus)
    })
  })

  describe('Complex Role Combinations', () => {
    it('should handle Super Admin with all permissions', () => {
      const superAdmin = {
        _id: 'super-admin',
        role_id: {
          nom: 'Super Administrateur',
          permissions: ALL_PERMISSIONS.reduce((acc, perm) => {
            acc[perm] = true
            return acc
          }, {}),
          visibleMenus: ALL_MENUS.reduce((acc, menu) => {
            acc[menu] = true
            return acc
          }, {})
        }
      }

      const menus = getVisibleMenus(superAdmin)
      expect(menus).toHaveLength(14)

      ALL_PERMISSIONS.forEach(perm => {
        expect(hasPermission(superAdmin, perm)).toBe(true)
      })
    })

    it('should handle Guest with minimal permissions', () => {
      const guest = {
        _id: 'guest',
        role_id: {
          nom: 'Invité',
          permissions: {
            voirSesProjets: true
          },
          visibleMenus: {
            portfolio: true,
            projects: true
          }
        }
      }

      const menus = getVisibleMenus(guest)
      expect(menus).toHaveLength(2)
      expect(hasPermission(guest, 'voirSesProjets')).toBe(true)
      expect(hasPermission(guest, 'adminConfig')).toBe(false)
      expect(hasPermission(guest, 'gererUtilisateurs')).toBe(false)
    })

    it('should handle role transitions correctly', () => {
      // Simulate user being promoted from Developer to Manager
      const developerRole = {
        permissions: {
          voirSesProjets: true,
          deplacerTaches: true,
          saisirTemps: true,
          commenter: true,
          gererFichiers: true
        },
        visibleMenus: {
          portfolio: true,
          projects: true,
          kanban: true,
          tasks: true,
          files: true,
          timesheets: true
        }
      }

      const managerRole = {
        permissions: {
          ...developerRole.permissions,
          voirTousProjets: true,
          gererTaches: true,
          prioriserBacklog: true,
          gererSprints: true,
          voirBudget: true,
          genererRapports: true
        },
        visibleMenus: {
          ...developerRole.visibleMenus,
          backlog: true,
          sprints: true,
          roadmap: true,
          budget: true,
          reports: true
        }
      }

      const devUser = { role_id: developerRole }
      const managerUser = { role_id: managerRole }

      const devMenus = getVisibleMenus(devUser)
      const managerMenus = getVisibleMenus(managerUser)

      expect(managerMenus.length).toBeGreaterThan(devMenus.length)
      expect(hasPermission(managerUser, 'gererSprints')).toBe(true)
      expect(hasPermission(devUser, 'gererSprints')).toBe(false)
    })
  })

  describe('getAccessibleData Function', () => {
    it('should return all false for null user', () => {
      const data = getAccessibleData(null)

      expect(data.canViewBudget).toBe(false)
      expect(data.canModifyBudget).toBe(false)
      expect(data.canViewTimesheets).toBe(false)
      expect(data.canManageTasks).toBe(false)
      expect(data.canManageFiles).toBe(false)
    })

    it('should return correct accessible data for manager', () => {
      const manager = {
        role_id: {
          permissions: {
            voirBudget: true,
            modifierBudget: true,
            voirTempsPasses: true,
            saisirTemps: false,
            gererTaches: true,
            deplacerTaches: true,
            prioriserBacklog: true,
            gererSprints: true,
            validerLivrable: true,
            gererFichiers: true,
            commenter: true,
            gererMembresProjet: true,
            changerRoleMembre: true
          }
        }
      }

      const data = getAccessibleData(manager)

      expect(data.canViewBudget).toBe(true)
      expect(data.canModifyBudget).toBe(true)
      expect(data.canViewTimesheets).toBe(true)
      expect(data.canSubmitTimesheet).toBe(false)
      expect(data.canManageTasks).toBe(true)
      expect(data.canMoveTasks).toBe(true)
      expect(data.canPrioritizeBacklog).toBe(true)
      expect(data.canManageSprints).toBe(true)
      expect(data.canValidateDeliverables).toBe(true)
      expect(data.canManageFiles).toBe(true)
      expect(data.canComment).toBe(true)
      expect(data.canManageMembers).toBe(true)
      expect(data.canChangeRoles).toBe(true)
    })

    it('should apply project role restrictions in getAccessibleData', () => {
      const systemRole = {
        permissions: {
          voirBudget: true,
          modifierBudget: true,
          gererTaches: true
        }
      }

      const projectRole = {
        permissions: {
          voirBudget: true,
          modifierBudget: false, // Project restricts
          gererTaches: false // Project restricts
        }
      }

      const user = { role_id: systemRole }
      const data = getAccessibleData(user, projectRole)

      expect(data.canViewBudget).toBe(true) // Both allow
      expect(data.canModifyBudget).toBe(false) // Project restricts
      expect(data.canManageTasks).toBe(false) // Project restricts
    })
  })

  describe('Project Membership Access', () => {
    const mockProject = {
      _id: 'project-123',
      chef_projet: 'user-pm',
      product_owner: 'user-po',
      membres: [
        { user_id: 'user-dev1' },
        { user_id: 'user-dev2' }
      ]
    }

    it('should grant access to project chef', () => {
      const chefUser = {
        _id: 'user-pm',
        role_id: {
          permissions: {
            voirSesProjets: true,
            gererTaches: true
          }
        }
      }

      expect(canAccessProjectResource(chefUser, mockProject, 'gererTaches')).toBe(true)
    })

    it('should grant access to product owner', () => {
      const poUser = {
        _id: 'user-po',
        role_id: {
          permissions: {
            voirSesProjets: true,
            prioriserBacklog: true
          }
        }
      }

      expect(canAccessProjectResource(poUser, mockProject, 'prioriserBacklog')).toBe(true)
    })

    it('should grant access to team member', () => {
      const devUser = {
        _id: 'user-dev1',
        role_id: {
          permissions: {
            voirSesProjets: true,
            deplacerTaches: true
          }
        }
      }

      expect(canAccessProjectResource(devUser, mockProject, 'deplacerTaches')).toBe(true)
    })

    it('should deny access to non-member', () => {
      const outsideUser = {
        _id: 'user-outside',
        role_id: {
          permissions: {
            voirSesProjets: true,
            gererTaches: true
          }
        }
      }

      expect(canAccessProjectResource(outsideUser, mockProject, 'gererTaches')).toBe(false)
    })

    it('should grant access to admin regardless of membership', () => {
      const adminUser = {
        _id: 'user-admin',
        role_id: {
          permissions: {
            adminConfig: true
          }
        }
      }

      expect(canAccessProjectResource(adminUser, mockProject, 'gererTaches')).toBe(true)
    })

    it('should deny access when system role denies permission', () => {
      const memberWithDeniedPerm = {
        _id: 'user-dev1',
        role_id: {
          permissions: {
            voirSesProjets: true,
            modifierBudget: false // System denies
          }
        }
      }

      expect(canAccessProjectResource(memberWithDeniedPerm, mockProject, 'modifierBudget')).toBe(false)
    })
  })

  describe('Concurrent Permission Checks', () => {
    it('should handle multiple permission checks consistently', () => {
      const user = {
        _id: 'user-123',
        role_id: {
          permissions: {
            voirTousProjets: true,
            gererTaches: true,
            modifierBudget: false
          }
        }
      }

      const results = []
      for (let i = 0; i < 100; i++) {
        results.push({
          voirTousProjets: hasPermission(user, 'voirTousProjets'),
          gererTaches: hasPermission(user, 'gererTaches'),
          modifierBudget: hasPermission(user, 'modifierBudget')
        })
      }

      // All results should be identical
      results.forEach(result => {
        expect(result.voirTousProjets).toBe(true)
        expect(result.gererTaches).toBe(true)
        expect(result.modifierBudget).toBe(false)
      })
    })
  })

  describe('Permission Categories', () => {
    it('should categorize permissions correctly', () => {
      const categories = {
        projets: ['voirTousProjets', 'voirSesProjets', 'creerProjet', 'supprimerProjet', 'modifierCharteProjet'],
        equipe: ['gererMembresProjet', 'changerRoleMembre'],
        taches: ['gererTaches', 'deplacerTaches', 'prioriserBacklog'],
        sprints: ['gererSprints'],
        budget: ['modifierBudget', 'voirBudget'],
        temps: ['voirTempsPasses', 'saisirTemps'],
        livrables: ['validerLivrable'],
        fichiers: ['gererFichiers'],
        communication: ['commenter', 'recevoirNotifications'],
        rapportsAudit: ['genererRapports', 'voirAudit'],
        administration: ['gererUtilisateurs', 'adminConfig']
      }

      const allCategorized = Object.values(categories).flat()

      expect(allCategorized).toHaveLength(23)
      expect(allCategorized.sort()).toEqual([...ALL_PERMISSIONS].sort())
    })
  })
})
