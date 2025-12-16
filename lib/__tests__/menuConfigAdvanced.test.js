/**
 * Advanced Menu Configuration Tests
 * Tests for menu filtering, permission checks, and UI consistency
 */

import {
  MAIN_MENU_ITEMS,
  ADMIN_MENU_ITEMS,
  NOTIFICATIONS_MENU,
  filterMenuItemsByPermissions,
  getAvailableMenus,
  canAccessMenuItem,
  getMenuStats
} from '@/lib/menuConfig'

import { ALL_PERMISSIONS, ALL_MENUS } from '@/lib/permissions'

describe('Advanced Menu Configuration Tests', () => {
  describe('Menu Items Structure', () => {
    it('should have correct structure for main menu items', () => {
      MAIN_MENU_ITEMS.forEach(item => {
        expect(item).toHaveProperty('icon')
        expect(item).toHaveProperty('label')
        expect(item).toHaveProperty('href')
        expect(item).toHaveProperty('menuKey')
        expect(item).toHaveProperty('permissionKey')
        expect(item).toHaveProperty('description')

        expect(typeof item.label).toBe('string')
        expect(item.href.startsWith('/dashboard')).toBe(true)
        expect(ALL_MENUS).toContain(item.menuKey)
        expect(ALL_PERMISSIONS).toContain(item.permissionKey)
      })
    })

    it('should have correct structure for admin menu items', () => {
      ADMIN_MENU_ITEMS.forEach(item => {
        expect(item).toHaveProperty('icon')
        expect(item).toHaveProperty('label')
        expect(item).toHaveProperty('href')
        expect(item).toHaveProperty('permissionKey')
        expect(item).toHaveProperty('menuKey')

        expect(item.menuKey).toBe('admin')
        expect(ALL_PERMISSIONS).toContain(item.permissionKey)
      })
    })

    it('should have correct structure for notifications menu', () => {
      expect(NOTIFICATIONS_MENU).toHaveProperty('icon')
      expect(NOTIFICATIONS_MENU).toHaveProperty('label')
      expect(NOTIFICATIONS_MENU).toHaveProperty('href')
      expect(NOTIFICATIONS_MENU).toHaveProperty('permissionKey')
      expect(NOTIFICATIONS_MENU).toHaveProperty('menuKey')

      expect(NOTIFICATIONS_MENU.permissionKey).toBe('recevoirNotifications')
      expect(NOTIFICATIONS_MENU.menuKey).toBe('notifications')
    })
  })

  describe('Menu Permission Mapping', () => {
    it('should map correct permissions to main menu items', () => {
      const expectedMappings = {
        '/dashboard': 'voirSesProjets',
        '/dashboard/projects': 'voirSesProjets',
        '/dashboard/kanban': 'deplacerTaches',
        '/dashboard/backlog': 'prioriserBacklog',
        '/dashboard/sprints': 'gererSprints',
        '/dashboard/roadmap': 'voirSesProjets',
        '/dashboard/tasks': 'gererTaches',
        '/dashboard/files': 'gererFichiers',
        '/dashboard/comments': 'commenter',
        '/dashboard/timesheets': 'saisirTemps',
        '/dashboard/budget': 'voirBudget',
        '/dashboard/reports': 'genererRapports'
      }

      Object.entries(expectedMappings).forEach(([href, permissionKey]) => {
        const menuItem = MAIN_MENU_ITEMS.find(item => item.href === href)
        if (menuItem) {
          expect(menuItem.permissionKey).toBe(permissionKey)
        }
      })
    })

    it('should map admin permissions to admin menu items', () => {
      const adminPermissions = ADMIN_MENU_ITEMS.map(item => item.permissionKey)

      expect(adminPermissions).toContain('adminConfig')
      expect(adminPermissions).toContain('gererUtilisateurs')
      expect(adminPermissions).toContain('voirAudit')
    })
  })

  describe('filterMenuItemsByPermissions', () => {
    it('should return empty array for null user', () => {
      const result = filterMenuItemsByPermissions(MAIN_MENU_ITEMS, null)
      expect(result).toEqual([])
    })

    it('should return empty array for user without role', () => {
      const result = filterMenuItemsByPermissions(MAIN_MENU_ITEMS, { _id: 'user-123' })
      expect(result).toEqual([])
    })

    it('should filter based on both permission and menu visibility', () => {
      const user = {
        _id: 'user-123',
        role: {
          permissions: {
            voirSesProjets: true,
            deplacerTaches: true,
            gererTaches: false
          },
          visibleMenus: {
            portfolio: true,
            projects: true,
            kanban: true,
            tasks: false // Even though user might have permission
          }
        }
      }

      const result = filterMenuItemsByPermissions(MAIN_MENU_ITEMS, user)

      const hrefs = result.map(item => item.href)
      expect(hrefs).toContain('/dashboard')
      expect(hrefs).toContain('/dashboard/projects')
      expect(hrefs).toContain('/dashboard/kanban')
      expect(hrefs).not.toContain('/dashboard/tasks')
    })

    it('should require BOTH permission AND menu visibility', () => {
      // User has permission but menu is hidden
      const userHiddenMenu = {
        _id: 'user-1',
        role: {
          permissions: {
            voirBudget: true
          },
          visibleMenus: {
            budget: false // Hidden
          }
        }
      }

      // User has menu visible but no permission
      const userNoPermission = {
        _id: 'user-2',
        role: {
          permissions: {
            voirBudget: false
          },
          visibleMenus: {
            budget: true
          }
        }
      }

      const result1 = filterMenuItemsByPermissions(MAIN_MENU_ITEMS, userHiddenMenu)
      const result2 = filterMenuItemsByPermissions(MAIN_MENU_ITEMS, userNoPermission)

      const budgetItem1 = result1.find(item => item.href === '/dashboard/budget')
      const budgetItem2 = result2.find(item => item.href === '/dashboard/budget')

      expect(budgetItem1).toBeUndefined()
      expect(budgetItem2).toBeUndefined()
    })
  })

  describe('getAvailableMenus', () => {
    it('should return complete menu structure for admin', () => {
      const adminUser = {
        _id: 'admin',
        role: {
          permissions: ALL_PERMISSIONS.reduce((acc, p) => ({ ...acc, [p]: true }), {}),
          visibleMenus: ALL_MENUS.reduce((acc, m) => ({ ...acc, [m]: true }), {})
        }
      }

      const menus = getAvailableMenus(adminUser)

      expect(menus).toHaveProperty('mainMenuItems')
      expect(menus).toHaveProperty('adminMenuItems')
      expect(menus).toHaveProperty('notificationsMenu')

      expect(menus.mainMenuItems.length).toBeGreaterThan(0)
      expect(menus.adminMenuItems.length).toBeGreaterThan(0)
      expect(menus.notificationsMenu).not.toBeNull()
    })

    it('should return limited menus for basic user', () => {
      const basicUser = {
        _id: 'basic',
        role: {
          permissions: {
            voirSesProjets: true,
            deplacerTaches: true,
            commenter: true,
            recevoirNotifications: true
          },
          visibleMenus: {
            portfolio: true,
            projects: true,
            kanban: true,
            comments: true,
            notifications: true,
            admin: false
          }
        }
      }

      const menus = getAvailableMenus(basicUser)

      expect(menus.mainMenuItems.length).toBeLessThan(MAIN_MENU_ITEMS.length)
      expect(menus.adminMenuItems).toHaveLength(0)
      expect(menus.notificationsMenu).not.toBeNull()
    })

    it('should handle user without notifications permission', () => {
      const noNotifUser = {
        _id: 'no-notif',
        role: {
          permissions: {
            voirSesProjets: true,
            recevoirNotifications: false
          },
          visibleMenus: {
            portfolio: true,
            projects: true,
            notifications: false
          }
        }
      }

      const menus = getAvailableMenus(noNotifUser)

      expect(menus.notificationsMenu).toBeNull()
    })
  })

  describe('canAccessMenuItem', () => {
    it('should return true for accessible menu', () => {
      const user = {
        role: {
          permissions: { voirSesProjets: true },
          visibleMenus: { projects: true }
        }
      }

      expect(canAccessMenuItem('/dashboard/projects', user)).toBe(true)
    })

    it('should return false for inaccessible menu', () => {
      const user = {
        role: {
          permissions: { adminConfig: false },
          visibleMenus: { admin: false }
        }
      }

      expect(canAccessMenuItem('/dashboard/admin/roles', user)).toBe(false)
    })

    it('should return false for unknown route', () => {
      const user = {
        role: {
          permissions: { adminConfig: true },
          visibleMenus: { admin: true }
        }
      }

      expect(canAccessMenuItem('/dashboard/unknown-route', user)).toBe(false)
    })
  })

  describe('getMenuStats', () => {
    it('should calculate correct menu statistics', () => {
      const adminUser = {
        _id: 'admin',
        role: {
          permissions: ALL_PERMISSIONS.reduce((acc, p) => ({ ...acc, [p]: true }), {}),
          visibleMenus: ALL_MENUS.reduce((acc, m) => ({ ...acc, [m]: true }), {})
        }
      }

      const stats = getMenuStats(adminUser)

      expect(stats).toHaveProperty('totalMainMenuItems')
      expect(stats).toHaveProperty('totalAdminMenuItems')
      expect(stats).toHaveProperty('hasNotifications')
      expect(stats).toHaveProperty('hasAdminAccess')
      expect(stats).toHaveProperty('totalMenuItems')

      expect(stats.totalMainMenuItems).toBe(MAIN_MENU_ITEMS.length)
      expect(stats.totalAdminMenuItems).toBe(ADMIN_MENU_ITEMS.length)
      expect(stats.hasNotifications).toBe(true)
      expect(stats.hasAdminAccess).toBe(true)
    })

    it('should show no admin access for regular user', () => {
      const regularUser = {
        _id: 'regular',
        role: {
          permissions: {
            voirSesProjets: true,
            recevoirNotifications: true
          },
          visibleMenus: {
            portfolio: true,
            projects: true,
            notifications: true,
            admin: false
          }
        }
      }

      const stats = getMenuStats(regularUser)

      expect(stats.hasAdminAccess).toBe(false)
      expect(stats.totalAdminMenuItems).toBe(0)
    })
  })

  describe('Role-Specific Menu Visibility', () => {
    const testCases = [
      {
        name: 'Super Admin',
        expectedMainMenus: 12,
        expectedAdminMenus: 8,
        permissions: ALL_PERMISSIONS.reduce((acc, p) => ({ ...acc, [p]: true }), {}),
        visibleMenus: ALL_MENUS.reduce((acc, m) => ({ ...acc, [m]: true }), {})
      },
      {
        name: 'Chef de Projet',
        expectedMainMenus: 12,
        expectedAdminMenus: 0,
        permissions: {
          voirSesProjets: true,
          voirTousProjets: true,
          creerProjet: true,
          modifierCharteProjet: true,
          gererMembresProjet: true,
          gererTaches: true,
          deplacerTaches: true,
          prioriserBacklog: true,
          gererSprints: true,
          voirBudget: true,
          modifierBudget: true,
          voirTempsPasses: true,
          saisirTemps: true,
          gererFichiers: true,
          commenter: true,
          recevoirNotifications: true,
          genererRapports: true
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
      },
      {
        name: 'Développeur',
        expectedMainMenus: 8,
        expectedAdminMenus: 0,
        permissions: {
          voirSesProjets: true,
          gererTaches: true,
          deplacerTaches: true,
          saisirTemps: true,
          gererFichiers: true,
          commenter: true,
          recevoirNotifications: true
        },
        visibleMenus: {
          portfolio: true,
          projects: true,
          kanban: true,
          tasks: true,
          files: true,
          comments: true,
          timesheets: true,
          notifications: true,
          admin: false
        }
      },
      {
        name: 'Observateur',
        expectedMainMenus: 3,
        expectedAdminMenus: 0,
        permissions: {
          voirSesProjets: true,
          recevoirNotifications: true
        },
        visibleMenus: {
          portfolio: true,
          projects: true,
          notifications: true,
          admin: false
        }
      }
    ]

    testCases.forEach(({ name, expectedMainMenus, expectedAdminMenus, permissions, visibleMenus }) => {
      it(`should show correct menus for ${name}`, () => {
        const user = {
          _id: `user-${name}`,
          role: { permissions, visibleMenus }
        }

        const menus = getAvailableMenus(user)

        expect(menus.mainMenuItems.length).toBeLessThanOrEqual(expectedMainMenus)
        expect(menus.adminMenuItems.length).toBe(expectedAdminMenus)
      })
    })
  })

  describe('Menu URL Integrity', () => {
    it('should have unique URLs for all menu items', () => {
      const allItems = [...MAIN_MENU_ITEMS, ...ADMIN_MENU_ITEMS]
      const urls = allItems.map(item => item.href)
      const uniqueUrls = new Set(urls)

      expect(uniqueUrls.size).toBe(urls.length)
    })

    it('should have valid dashboard URLs', () => {
      const allItems = [...MAIN_MENU_ITEMS, ...ADMIN_MENU_ITEMS, NOTIFICATIONS_MENU]

      allItems.forEach(item => {
        expect(item.href).toMatch(/^\/dashboard/)
        expect(item.href).not.toMatch(/\/\//) // No double slashes
        expect(item.href).not.toMatch(/\s/) // No spaces
      })
    })
  })

  describe('Menu Consistency', () => {
    it('should have consistent menu keys between config and permissions', () => {
      const menuKeys = new Set([
        ...MAIN_MENU_ITEMS.map(i => i.menuKey),
        ...ADMIN_MENU_ITEMS.map(i => i.menuKey),
        NOTIFICATIONS_MENU.menuKey
      ])

      menuKeys.forEach(key => {
        expect(ALL_MENUS).toContain(key)
      })
    })

    it('should have consistent permission keys between config and permissions', () => {
      const permissionKeys = new Set([
        ...MAIN_MENU_ITEMS.map(i => i.permissionKey),
        ...ADMIN_MENU_ITEMS.map(i => i.permissionKey),
        NOTIFICATIONS_MENU.permissionKey
      ])

      permissionKeys.forEach(key => {
        expect(ALL_PERMISSIONS).toContain(key)
      })
    })
  })

  describe('Admin Menu Items Count', () => {
    it('should have expected admin menu items', () => {
      const adminLabels = ADMIN_MENU_ITEMS.map(item => item.label)

      expect(adminLabels).toContain('Rôles & Permissions')
      expect(adminLabels).toContain('Utilisateurs')
      expect(adminLabels).toContain('Templates Projets')
      expect(adminLabels).toContain('Types Livrables')
      expect(adminLabels).toContain('SharePoint')
      expect(adminLabels).toContain('Audit & Logs')
      expect(adminLabels).toContain('Paramètres')
      expect(adminLabels).toContain('Maintenance')

      expect(ADMIN_MENU_ITEMS).toHaveLength(8)
    })
  })

  describe('Main Menu Items Count', () => {
    it('should have expected main menu items', () => {
      const mainLabels = MAIN_MENU_ITEMS.map(item => item.label)

      expect(mainLabels).toContain('Dashboard')
      expect(mainLabels).toContain('Projets')
      expect(mainLabels).toContain('Kanban')
      expect(mainLabels).toContain('Backlog')
      expect(mainLabels).toContain('Sprints')
      expect(mainLabels).toContain('Roadmap')
      expect(mainLabels).toContain('Tâches')
      expect(mainLabels).toContain('Fichiers')
      expect(mainLabels).toContain('Commentaires')
      expect(mainLabels).toContain('Timesheets')
      expect(mainLabels).toContain('Budget')
      expect(mainLabels).toContain('Rapports')

      expect(MAIN_MENU_ITEMS).toHaveLength(12)
    })
  })
})
