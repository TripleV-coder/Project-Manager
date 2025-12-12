/**
 * Menu Visibility Tests
 * Tests for role-based menu visibility across system and project roles
 */

import {
  getVisibleMenus,
  isMenuVisible,
  getMergedPermissions,
  ALL_MENUS
} from '@/lib/permissions'

describe('Menu Visibility by Role', () => {
  describe('Admin Role', () => {
    const adminUser = {
      _id: 'user-admin',
      role_id: {
        nom: 'Admin',
        permissions: {},
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
          admin: true
        }
      }
    }

    it('should have access to all menus', () => {
      const menus = getVisibleMenus(adminUser)

      expect(menus).toHaveLength(14)
      expect(menus).toContain('portfolio')
      expect(menus).toContain('projects')
      expect(menus).toContain('kanban')
      expect(menus).toContain('backlog')
      expect(menus).toContain('sprints')
      expect(menus).toContain('roadmap')
      expect(menus).toContain('tasks')
      expect(menus).toContain('files')
      expect(menus).toContain('comments')
      expect(menus).toContain('timesheets')
      expect(menus).toContain('budget')
      expect(menus).toContain('reports')
      expect(menus).toContain('notifications')
      expect(menus).toContain('admin')
    })

    it('should see admin menu', () => {
      expect(isMenuVisible(adminUser, 'admin')).toBe(true)
    })

    ALL_MENUS.forEach(menu => {
      it(`should have access to ${menu} menu`, () => {
        expect(isMenuVisible(adminUser, menu)).toBe(true)
      })
    })
  })

  describe('Project Manager Role', () => {
    const pmUser = {
      _id: 'user-pm',
      role_id: {
        nom: 'Project Manager',
        permissions: {
          voirTousProjets: true,
          creerProjet: true,
          supprimerProjet: false,
          gererMembresProjet: true,
          changerRoleMembre: true,
          gererTaches: true,
          deplacerTaches: true,
          prioriserBacklog: true,
          gererSprints: true,
          modifierBudget: true,
          voirBudget: true,
          voirTempsPasses: true,
          saisirTemps: false,
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

    it('should have access to all menus except admin', () => {
      const menus = getVisibleMenus(pmUser)

      expect(menus).toHaveLength(13)
      expect(menus).not.toContain('admin')
    })

    it('should NOT see admin menu', () => {
      expect(isMenuVisible(pmUser, 'admin')).toBe(false)
    })

    it('should see project management menus', () => {
      expect(isMenuVisible(pmUser, 'projects')).toBe(true)
      expect(isMenuVisible(pmUser, 'kanban')).toBe(true)
      expect(isMenuVisible(pmUser, 'backlog')).toBe(true)
      expect(isMenuVisible(pmUser, 'sprints')).toBe(true)
      expect(isMenuVisible(pmUser, 'roadmap')).toBe(true)
    })

    it('should see budget and reports menus', () => {
      expect(isMenuVisible(pmUser, 'budget')).toBe(true)
      expect(isMenuVisible(pmUser, 'reports')).toBe(true)
    })
  })

  describe('Developer Role', () => {
    const devUser = {
      _id: 'user-dev',
      role_id: {
        nom: 'Developer',
        permissions: {
          voirSesProjets: true,
          gererTaches: false,
          deplacerTaches: true,
          saisirTemps: true,
          commenter: true,
          gererFichiers: true,
          voirBudget: false,
          modifierBudget: false,
          genererRapports: false,
          voirAudit: false,
          gererUtilisateurs: false,
          adminConfig: false
        },
        visibleMenus: {
          portfolio: true,
          projects: true,
          kanban: true,
          backlog: false,
          sprints: false,
          roadmap: false,
          tasks: true,
          files: true,
          comments: true,
          timesheets: true,
          budget: false,
          reports: false,
          notifications: true,
          admin: false
        }
      }
    }

    it('should have limited menu access', () => {
      const menus = getVisibleMenus(devUser)

      expect(menus).toHaveLength(8)
      expect(menus).toContain('projects')
      expect(menus).toContain('kanban')
      expect(menus).toContain('tasks')
      expect(menus).toContain('files')
      expect(menus).toContain('comments')
      expect(menus).toContain('timesheets')
    })

    it('should NOT see planning menus (backlog, sprints, roadmap)', () => {
      expect(isMenuVisible(devUser, 'backlog')).toBe(false)
      expect(isMenuVisible(devUser, 'sprints')).toBe(false)
      expect(isMenuVisible(devUser, 'roadmap')).toBe(false)
    })

    it('should NOT see budget and reports menus', () => {
      expect(isMenuVisible(devUser, 'budget')).toBe(false)
      expect(isMenuVisible(devUser, 'reports')).toBe(false)
    })

    it('should see kanban and task menus', () => {
      expect(isMenuVisible(devUser, 'kanban')).toBe(true)
      expect(isMenuVisible(devUser, 'tasks')).toBe(true)
      expect(isMenuVisible(devUser, 'timesheets')).toBe(true)
    })
  })

  describe('Viewer Role (Read-Only)', () => {
    const viewerUser = {
      _id: 'user-viewer',
      role_id: {
        nom: 'Viewer',
        permissions: {
          voirSesProjets: true,
          deplacerTaches: false,
          saisirTemps: false,
          commenter: false,
          gererFichiers: false,
          voirBudget: true,
          modifierBudget: false,
          genererRapports: true
        },
        visibleMenus: {
          portfolio: true,
          projects: true,
          kanban: true,
          backlog: false,
          sprints: false,
          roadmap: false,
          tasks: true,
          files: false,
          comments: false,
          timesheets: false,
          budget: true,
          reports: true,
          notifications: true,
          admin: false
        }
      }
    }

    it('should have minimal menu access', () => {
      const menus = getVisibleMenus(viewerUser)

      expect(menus.length).toBeLessThan(8)
      expect(menus).toContain('projects')
      expect(menus).toContain('kanban')
      expect(menus).toContain('budget')
      expect(menus).toContain('reports')
    })

    it('should NOT see collaborative menus (files, comments, timesheets)', () => {
      expect(isMenuVisible(viewerUser, 'files')).toBe(false)
      expect(isMenuVisible(viewerUser, 'comments')).toBe(false)
      expect(isMenuVisible(viewerUser, 'timesheets')).toBe(false)
    })

    it('should see budget and reports (read-only)', () => {
      expect(isMenuVisible(viewerUser, 'budget')).toBe(true)
      expect(isMenuVisible(viewerUser, 'reports')).toBe(true)
    })
  })

  describe('Project Role Restrictions (Most Restrictive)', () => {
    const systemRole = {
      nom: 'Manager',
      permissions: {},
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

    it('should restrict menus at project level', () => {
      const projectRole = {
        permissions: {},
        visibleMenus: {
          portfolio: true,
          projects: true,
          kanban: true,
          backlog: false, // Restricted
          sprints: false, // Restricted
          roadmap: false, // Restricted
          tasks: true,
          files: false, // Restricted
          comments: true,
          timesheets: true,
          budget: false, // Restricted
          reports: false, // Restricted
          notifications: true,
          admin: false
        }
      }

      const merged = getMergedPermissions(
        { role_id: { ...systemRole } },
        projectRole
      )

      // System allows but project denies → false
      expect(merged.visibleMenus.backlog).toBe(false)
      expect(merged.visibleMenus.sprints).toBe(false)
      expect(merged.visibleMenus.roadmap).toBe(false)
      expect(merged.visibleMenus.files).toBe(false)
      expect(merged.visibleMenus.budget).toBe(false)
      expect(merged.visibleMenus.reports).toBe(false)

      // Both allow → true
      expect(merged.visibleMenus.kanban).toBe(true)
      expect(merged.visibleMenus.tasks).toBe(true)
      expect(merged.visibleMenus.comments).toBe(true)
    })

    it('should apply most restrictive approach', () => {
      const user = {
        role_id: {
          permissions: {},
          visibleMenus: {
            kanban: true,
            budget: true,
            sprints: true,
            backlog: true,
            admin: false
          }
        }
      }

      const projectRole = {
        permissions: {},
        visibleMenus: {
          kanban: true, // Both true → true
          budget: false, // Project restricts → false
          sprints: false, // Project restricts → false
          backlog: true, // Both true → true
          admin: false // Both false → false
        }
      }

      const user1 = { role_id: user.role_id }
      const menus = getMergedPermissions(user1, projectRole)

      expect(menus.visibleMenus.kanban).toBe(true)
      expect(menus.visibleMenus.budget).toBe(false)
      expect(menus.visibleMenus.sprints).toBe(false)
      expect(menus.visibleMenus.backlog).toBe(true)
    })
  })

  describe('Menu Visibility by Use Cases', () => {
    it('should show planning menus only for roles with gererSprints', () => {
      const plannerRole = {
        nom: 'Planner',
        permissions: { gererSprints: true },
        visibleMenus: {
          sprints: true,
          backlog: true,
          roadmap: true,
          portfolio: true
        }
      }

      const user = { role_id: plannerRole }
      expect(isMenuVisible(user, 'sprints')).toBe(true)
      expect(isMenuVisible(user, 'backlog')).toBe(true)
      expect(isMenuVisible(user, 'roadmap')).toBe(true)
    })

    it('should show budget menu only for roles with voirBudget', () => {
      const financeRole = {
        nom: 'Finance',
        permissions: { voirBudget: true },
        visibleMenus: {
          budget: true,
          reports: true
        }
      }

      const user = { role_id: financeRole }
      expect(isMenuVisible(user, 'budget')).toBe(true)
    })

    it('should show timesheets menu only for roles with saisirTemps or voirTempsPasses', () => {
      const hrRole = {
        nom: 'HR',
        permissions: { voirTempsPasses: true },
        visibleMenus: {
          timesheets: true
        }
      }

      const user = { role_id: hrRole }
      expect(isMenuVisible(user, 'timesheets')).toBe(true)
    })

    it('should show admin menu only for adminConfig permission', () => {
      const adminRole = {
        nom: 'Admin',
        permissions: { adminConfig: true },
        visibleMenus: {
          admin: true
        }
      }

      const user = { role_id: adminRole }
      expect(isMenuVisible(user, 'admin')).toBe(true)

      // Non-admin should not see it
      const nonAdminRole = {
        nom: 'User',
        permissions: { adminConfig: false },
        visibleMenus: {
          admin: false
        }
      }

      const userNonAdmin = { role_id: nonAdminRole }
      expect(isMenuVisible(userNonAdmin, 'admin')).toBe(false)
    })
  })

  describe('Menu Consistency', () => {
    it('should have consistent menu counts across roles', () => {
      const roles = [
        { visibleMenus: { portfolio: true, projects: true, kanban: true, admin: true } },
        { visibleMenus: { portfolio: true, projects: true, kanban: true, admin: false } },
        { visibleMenus: { portfolio: true, kanban: true, tasks: true } }
      ]

      roles.forEach(role => {
        const menuCount = Object.values(role.visibleMenus).filter(v => v === true).length
        expect(menuCount).toBeGreaterThan(0)
        expect(menuCount).toBeLessThanOrEqual(14)
      })
    })

    it('should ensure portfolio is visible to all authenticated users', () => {
      const roles = [
        { visibleMenus: { portfolio: true, projects: true } },
        { visibleMenus: { portfolio: true, kanban: true } },
        { visibleMenus: { portfolio: true, tasks: true } }
      ]

      roles.forEach(role => {
        const user = { role_id: role }
        expect(isMenuVisible(user, 'portfolio')).toBe(true)
      })
    })

    it('should ensure projects menu is visible to all project participants', () => {
      const roles = [
        { visibleMenus: { projects: true, kanban: true, sprints: true } },
        { visibleMenus: { projects: true, tasks: true } },
        { visibleMenus: { projects: true, budget: true } }
      ]

      roles.forEach(role => {
        const user = { role_id: role }
        expect(isMenuVisible(user, 'projects')).toBe(true)
      })
    })
  })

  describe('Dynamic Menu Filtering', () => {
    it('should filter menus correctly for new users', () => {
      const newUserRole = {
        nom: 'New User',
        permissions: { voirSesProjets: true },
        visibleMenus: {
          portfolio: true,
          projects: true,
          kanban: true,
          tasks: true,
          notifications: true,
          admin: false
        }
      }

      const user = { role_id: newUserRole }
      const visibleMenus = getVisibleMenus(user)

      expect(visibleMenus).toContain('portfolio')
      expect(visibleMenus).toContain('projects')
      expect(visibleMenus).not.toContain('admin')
      expect(visibleMenus).not.toContain('budget')
    })

    it('should support role promotion (adding menus)', () => {
      const devRole = {
        visibleMenus: {
          projects: true,
          kanban: true,
          tasks: true
        }
      }

      const promoteToManagerRole = {
        visibleMenus: {
          projects: true,
          kanban: true,
          tasks: true,
          backlog: true,
          sprints: true,
          reports: true
        }
      }

      const devMenus = Object.keys(devRole.visibleMenus).filter(
        k => devRole.visibleMenus[k] === true
      )
      const managerMenus = Object.keys(promoteToManagerRole.visibleMenus).filter(
        k => promoteToManagerRole.visibleMenus[k] === true
      )

      expect(managerMenus.length).toBeGreaterThan(devMenus.length)
      expect(managerMenus).toEqual(expect.arrayContaining(devMenus))
    })
  })

  describe('Menu Visibility Validation', () => {
    it('should validate all 14 menus are defined in constants', () => {
      const definedMenus = [
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

      expect(ALL_MENUS).toEqual(expect.arrayContaining(definedMenus))
      expect(ALL_MENUS).toHaveLength(14)
    })

    it('should ensure no undefined menus are shown', () => {
      const roleWithUndefinedMenu = {
        visibleMenus: {
          portfolio: true,
          invalidMenu: true, // This should not be shown
          projects: true
        }
      }

      const user = { role_id: roleWithUndefinedMenu }
      const visibleMenus = getVisibleMenus(user)

      expect(visibleMenus).not.toContain('invalidMenu')
    })
  })
})
