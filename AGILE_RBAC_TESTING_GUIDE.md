# RBAC and Agile Modules Testing Guide

## 📋 Table of Contents

1. [Overview](#overview)
2. [RBAC Testing](#rbac-testing)
3. [Agile Modules Testing](#agile-modules-testing)
4. [Running Tests](#running-tests)
5. [Test Coverage](#test-coverage)
6. [Best Practices](#best-practices)

---

## Overview

This guide covers comprehensive testing for:

- **RBAC (Role-Based Access Control)**: Two-tier permission system (System Role + Project Role)
- **Agile Modules**: Sprint, Kanban, Backlog, Timesheet, Budget, Deliverables, Roadmap

### Test Structure

```
lib/
  __tests__/
    permissions.test.js              # RBAC core functionality (617 lines)
  services/__tests__/
    projectService.test.js           # Project management (445 lines)
    taskService.test.js              # Task management (420 lines)
    userService.test.js              # User management (450 lines)
    sprintService.test.js            # Sprint/Agile management (538 lines)
    kanbanService.test.js            # Kanban board operations (457 lines)
    timesheetService.test.js         # Time tracking (557 lines)
    budgetService.test.js            # Budget management (537 lines)
hooks/__tests__/
  useRBACPermissions.test.js         # RBAC React hook (526 lines)
```

**Total Test Lines**: 4,947+ lines of comprehensive test coverage

---

## RBAC Testing

### Core RBAC System (`lib/__tests__/permissions.test.js`)

#### 1. **Permission Merging (Most Restrictive Approach)**

Tests the two-tier RBAC system where both System Role AND Project Role must allow an action.

```javascript
describe('mergeRolePermissions', () => {
  // System: true, Project: true → true ✓
  // System: true, Project: false → false ✗
  // System: false, Project: true → false ✗
  // System: false, Project: false → false ✗
})
```

**Test Cases:**
- ✅ Both true → true (permission granted)
- ✅ One false → false (most restrictive)
- ✅ Both false → false
- ✅ Null projectRole → use system role only (fallback)
- ✅ Merges all 23 permissions
- ✅ Merges all 14 menu visibilities

#### 2. **Permission Checking**

Tests individual permission checks across the system.

```javascript
describe('hasPermission', () => {
  // With system role only
  hasPermission(user, 'voirTousProjets')           // true/false
  
  // With both roles (most restrictive)
  hasPermission(user, 'gererTaches', projectRole)  // enforces both
})
```

**Covered Permissions:**
```
voirTousProjets, voirSesProjets, creerProjet, supprimerProjet,
modifierCharteProjet, gererMembresProjet, changerRoleMembre,
gererTaches, deplacerTaches, prioriserBacklog, gererSprints,
modifierBudget, voirBudget, voirTempsPasses, saisirTemps,
validerLivrable, gererFichiers, commenter, recevoirNotifications,
genererRapports, voirAudit, gererUtilisateurs, adminConfig
```

#### 3. **Menu Visibility Control**

Tests menu access based on user permissions.

```javascript
describe('getVisibleMenus', () => {
  // Returns array of menus user can see
  const menus = getVisibleMenus(user)
  // ['projects', 'kanban', 'sprints', 'tasks', 'files', 'comments', ...]
})
```

**Covered Menus:**
```
portfolio, projects, kanban, backlog, sprints, roadmap, tasks,
files, comments, timesheets, budget, reports, notifications, admin
```

#### 4. **Accessible Data Control**

Tests granular data access permissions.

```javascript
describe('getAccessibleData', () => {
  const access = getAccessibleData(user, projectRole)
  // {
  //   canViewBudget: true/false,
  //   canModifyBudget: true/false,
  //   canViewTimesheets: true/false,
  //   ... 15 more properties
  // }
})
```

#### 5. **Project Resource Access**

Tests admin override and membership-based access.

```javascript
describe('canAccessProjectResource', () => {
  // Admin bypass
  user.role_id.permissions.adminConfig === true → true
  
  // Chef de projet/Product owner access
  project.chef_projet === userId → true
  
  // Project member access
  project.membres.some(m => m.user_id === userId) → true
})
```

### RBAC Hook (`hooks/__tests__/useRBACPermissions.test.js`)

Tests the React component hook for frontend permission checking.

#### 1. **User Shape Normalization**

Handles both backend (role_id) and frontend (role) user shapes.

```javascript
// Backend shape
user = { role_id: { permissions: {} } }

// Frontend shape
user = { role: { permissions: {} } }

// Hook auto-converts frontend → backend
```

#### 2. **Merged Permissions**

Returns combined System + Project role permissions.

#### 3. **Menu Access**

Returns object with all menu visibility states.

```javascript
canAccessMenus = {
  portfolio: true,
  projects: true,
  kanban: false,  // Restricted by project
  backlog: true,
  // ... all 14 menus
}
```

#### 4. **Permission Shortcuts**

Provides convenience methods for common checks.

```javascript
hook.canViewBudget           // hasPermission('voirBudget')
hook.canModifyBudget         // hasPermission('modifierBudget')
hook.canManageTasks          // hasPermission('gererTaches')
hook.canMoveTasks            // hasPermission('deplacerTaches')
hook.canPrioritizeBacklog    // hasPermission('prioriserBacklog')
hook.canManageSprints        // hasPermission('gererSprints')
// ... 13 more shortcuts
```

#### 5. **Hook Reactivity**

Tests updates when user or projectRole changes.

---

## Agile Modules Testing

### 1. Sprint Management (`sprintService.test.js`)

Tests sprint lifecycle and Scrum workflow.

#### Key Features Tested:

- **Sprint Creation**
  - Validates project exists
  - Sets default values (status = 'Planifié')
  - Stores capacity planning data

- **Sprint Lifecycle**
  - `startSprint()` → status = 'Actif'
  - `completeSprint()` → status = 'Terminé'
  - `deleteSprint()` → moves tasks to backlog

- **Sprint Statistics**
  - Total tasks / Completed tasks
  - Story points (planned vs completed)
  - Estimated hours vs Actual hours
  - Progress percentage
  - Burndown tracking

- **Team Capacity**
  - Total team capacity
  - Capacity per member
  - Updates and tracking

#### Test Cases (50+):

```javascript
describe('SprintService', () => {
  // Sprint CRUD
  getProjectSprints()
  getActiveSprint()
  getSprintById()
  createSprint()
  startSprint()
  completeSprint()
  deleteSprint()

  // Sprint Metrics
  getSprintStats()
  updateSprintCapacity()
  addTaskToSprint()
})
```

### 2. Kanban Board (`kanbanService.test.js`)

Tests task movement and Kanban workflow.

#### Key Features Tested:

- **Board Management**
  - Get full Kanban board with tasks grouped by column
  - Custom columns support
  - Handle projects without columns

- **Task Movement**
  - Move tasks between columns
  - Auto-update status based on column
  - Maintain task order

- **Column Statistics**
  - Task count per column
  - Story points per column
  - Blocked tasks
  - Overdue tasks
  - Unassigned tasks

- **Task Ordering**
  - Reorder tasks in column
  - Priority-based sorting
  - Update priorities (Basse/Moyenne/Haute/Critique)

- **Task Assignment**
  - Assign/unassign in Kanban context
  - Populate assignee details

#### Test Cases (40+):

```javascript
describe('KanbanService', () => {
  // Board Operations
  getKanbanBoard()
  getTasksByColumn()
  moveTask()
  reorderTasks()

  // Task Management
  assignTaskInKanban()
  updateTaskPriority()

  // Analytics
  getColumnStats()
})
```

### 3. Timesheet Management (`timesheetService.test.js`)

Tests time tracking and work hour validation.

#### Key Features Tested:

- **Timesheet CRUD**
  - Create entries (manual/timer)
  - Update entries
  - Delete with task hour rollback
  - Filter by date range

- **Submission Workflow**
  - Brouillon → Soumis → Validé/Refusé
  - Validation by manager
  - Rejection with comments
  - Task hour updates on validation

- **Time Tracking Statistics**
  - User timesheet stats (per period)
  - Project timesheet stats
  - Billable hours calculation
  - Validated vs pending hours

- **Task Hour Integration**
  - Update task actual hours on validation
  - Revert hours on deletion
  - Prevent double-counting

#### Test Cases (45+):

```javascript
describe('TimesheetService', () => {
  // Timesheet CRUD
  getUserTimesheets()
  getProjectTimesheets()
  createTimesheet()
  updateTimesheet()
  deleteTimesheet()

  // Workflow
  submitTimesheet()
  validateTimesheet()

  // Analytics
  getUserTimesheetStats()
  getProjectTimesheetStats()
})
```

### 4. Budget Management (`budgetService.test.js`)

Tests expense tracking and budget validation.

#### Key Features Tested:

- **Expense Management**
  - Create expenses (validating project exists)
  - Update expenses
  - Delete expenses
  - Filter by date range

- **Validation Workflow**
  - En attente → Validé/Refusé
  - Validation by approver
  - Multiple expense statuses

- **Budget Analytics**
  - Total vs validated expenses
  - Pending/rejected tracking
  - By-category breakdown
  - Budget vs actual comparison
  - Expense count statistics

- **Expense Categories**
  - Support all types (interne/externe/matériel/service/autre)
  - Category-based reporting
  - Category statistics

#### Test Cases (40+):

```javascript
describe('BudgetService', () => {
  // Expense CRUD
  getProjectExpenses()
  createExpense()
  updateExpense()
  deleteExpense()

  // Validation
  validateExpense()

  // Analytics
  getBudgetStats()
  getExpensesByCategory()
  updateProjectBudget()
})
```

---

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- projectService
npm test -- sprintService
npm test -- kanbanService
npm test -- timesheetService
npm test -- budgetService
npm test -- permissions
npm test -- useRBACPermissions

# Run specific test case
npm test -- sprintService -t "should start sprint"

# Watch mode (auto-rerun on file changes)
npm run test:watch

# Coverage report
npm run test:coverage

# Verbose output
npm run test:verbose
```

### Test Organization

```bash
# RBAC Tests
npm test -- lib/__tests__/permissions.test.js
npm test -- hooks/__tests__/useRBACPermissions.test.js

# Core Services
npm test -- lib/services/__tests__/projectService.test.js
npm test -- lib/services/__tests__/taskService.test.js
npm test -- lib/services/__tests__/userService.test.js

# Agile Services
npm test -- lib/services/__tests__/sprintService.test.js
npm test -- lib/services/__tests__/kanbanService.test.js
npm test -- lib/services/__tests__/timesheetService.test.js
npm test -- lib/services/__tests__/budgetService.test.js
```

---

## Test Coverage

### Coverage by Module

| Module | Tests | Lines | Coverage |
|--------|-------|-------|----------|
| Permissions (RBAC) | 35+ | 617 | ✅ High |
| useRBACPermissions | 30+ | 526 | ✅ High |
| ProjectService | 35+ | 445 | ✅ High |
| TaskService | 40+ | 420 | ✅ High |
| UserService | 40+ | 450 | ✅ High |
| SprintService | 50+ | 538 | ✅ High |
| KanbanService | 40+ | 457 | ✅ High |
| TimesheetService | 45+ | 557 | ✅ High |
| BudgetService | 40+ | 537 | ✅ High |
| **TOTAL** | **315+** | **4,947** | **✅ 80%+** |

### Checked Scenarios

#### RBAC Coverage
- ✅ Permission merging (most restrictive approach)
- ✅ System role vs project role enforcement
- ✅ Admin bypass mechanisms
- ✅ Menu visibility control
- ✅ Data access granularity
- ✅ Project membership checks
- ✅ Frontend/backend user shape normalization

#### Agile Coverage
- ✅ Sprint lifecycle (Planifié → Actif → Terminé)
- ✅ Task movement and kanban operations
- ✅ Time tracking and validation
- ✅ Budget and expense management
- ✅ Statistics and reporting
- ✅ Permission integration
- ✅ Data integrity (task hours, budget tracking)

---

## Best Practices

### 1. Testing Permissions

Always test both positive and negative cases:

```javascript
// ✅ Good
it('should allow if both system and project roles permit', () => {})
it('should deny if system role denies', () => {})
it('should deny if project role denies', () => {})

// ❌ Bad - only tests success case
it('should work with permissions', () => {})
```

### 2. Testing Agile Workflows

Test complete workflows, not just individual operations:

```javascript
// ✅ Good
describe('Sprint lifecycle', () => {
  it('should start sprint')
  it('should move incomplete tasks to backlog on completion')
  it('should update project stats')
})

// ❌ Bad - isolated operations
it('should update status')
```

### 3. Testing Integration

Test how modules interact:

```javascript
// ✅ Good
// Validate timesheet → Update task hours
// Delete timesheet → Revert task hours

// ❌ Bad
// Test timesheet in isolation from tasks
```

### 4. Testing Edge Cases

Always include boundary conditions:

```javascript
// ✅ Good
it('should handle zero tasks (0% progress)')
it('should handle null/undefined values')
it('should reject expired timesheets')

// ❌ Bad
// Only test happy path
```

### 5. Mocking Strategy

Mock external dependencies, test internal logic:

```javascript
// ✅ Good
jest.mock('@/models/Sprint')  // Mock database
// Test SprintService logic with mocked data

// ❌ Bad
jest.mock('@/lib/permissions')  // Mock things you want to test
```

---

## Debugging Tests

### Run Single Test
```bash
npm test -- sprintService -t "should create sprint"
```

### Debug in Node
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
# Then open chrome://inspect in Chrome
```

### Watch Mode
```bash
npm run test:watch
# Press 'p' to filter by filename
# Press 't' to filter by test name
# Press 'q' to quit
```

### Check Coverage Gaps
```bash
npm run test:coverage
# Look for uncovered lines in report
```

---

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v2
```

---

## Test Statistics

### By Category

**RBAC Tests**: 65+ tests
- Permission merging & checking
- Menu visibility
- Data access control
- User shape handling
- Hook functionality

**Agile Tests**: 250+ tests
- Sprint management (50+)
- Kanban operations (40+)
- Timesheet tracking (45+)
- Budget management (40+)
- Project/Task/User services (95+)

### Coverage Breakdown

- **Unit Tests**: 300+ tests
- **Integration Tests**: 15+ tests
- **Edge Cases**: 40+ tests
- **Workflow Tests**: 30+ tests

---

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [RBAC Concepts](https://en.wikipedia.org/wiki/Role-based_access_control)
- [Agile Methodologies](https://agilemanifesto.org/)

---

## Support

For questions or issues with testing:

1. Check individual test files for examples
2. Review test output with `--verbose` flag
3. Use watch mode for iterative testing
4. Check jest.config.js for configuration

---

**Last Updated**: December 2024
**Test Suite Version**: 1.0
**Total Test Lines**: 4,947+
**Target Coverage**: 80%+
