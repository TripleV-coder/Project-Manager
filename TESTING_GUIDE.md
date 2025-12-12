# Comprehensive Testing Guide

## 📋 Overview

This guide provides complete instructions for testing the Project Manager application, including unit tests, integration tests, and testing best practices.

## 🚀 Quick Start

### 1. Install Testing Dependencies

```bash
npm install
# or
yarn install
```

Testing dependencies are already included in `package.json`:
- **Jest**: Testing framework
- **@testing-library/react**: React component testing
- **@testing-library/jest-dom**: Jest matchers for DOM
- **jest-mock-extended**: Advanced mocking utilities
- **mongodb-memory-server**: In-memory MongoDB for testing

### 2. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with verbose output
npm run test:verbose
```

## 📁 Test Structure

Tests are organized in `__tests__` directories next to their source files:

```
lib/
  services/
    __tests__/
      projectService.test.js    # ProjectService unit tests
      taskService.test.js       # TaskService unit tests
      userService.test.js       # UserService unit tests
app/
  api/
    __tests__/
      integration.test.js       # API integration tests
```

## 🧪 Test Suites

### 1. ProjectService Unit Tests (`lib/services/__tests__/projectService.test.js`)

Tests for project management functionality:

**Key Test Cases:**
- `getAccessibleProjects` - Admin vs. regular user access filtering
- `getProjectById` - Fetch full project details
- `canUserAccessProject` - Permission checks (manager, owner, member)
- `createProject` - Project creation with validation
- `updateProject` - Project data updates
- `getProjectStats` - Calculate project statistics
- `addProjectMember` - Add team members to project
- `removeProjectMember` - Remove team members
- `toggleArchiveProject` - Archive/unarchive projects

**Run these tests:**
```bash
npm test -- projectService
```

### 2. TaskService Unit Tests (`lib/services/__tests__/taskService.test.js`)

Tests for task management:

**Key Test Cases:**
- `getProjectTasks` - Fetch tasks with filtering and pagination
- `getUserTasks` - Get user's assigned tasks
- `getTaskById` - Fetch task details
- `createTask` - Create task with validation
- `updateTask` - Update task information
- `updateTaskStatus` - Change task status
- `assignTask` - Assign task to user
- `deleteTask` - Delete task and update stats
- `updateProjectStats` - Recalculate project statistics
- `getTaskStats` - Get task statistics by status/priority

**Run these tests:**
```bash
npm test -- taskService
```

### 3. UserService Unit Tests (`lib/services/__tests__/userService.test.js`)

Tests for user management and authentication:

**Key Test Cases:**
- `getUserById` - Fetch user with role
- `getUserByEmail` - Find user by email
- `getUsers` - List users with pagination
- `createUser` - Create user with password hashing
- `updateUser` - Update user info (excluding password)
- `updatePassword` - Change password with validation
- `forceChangePassword` - Admin password reset
- `verifyCredentials` - Authenticate user
- `deleteUser` - Remove user
- `updateLastLogin` - Track login time
- `updateUserRole` - Change user role
- `getUserStats` - Get user statistics

**Run these tests:**
```bash
npm test -- userService
```

### 4. API Integration Tests (`app/api/__tests__/integration.test.js`)

Tests for full API request/response cycles:

**Coverage:**
- **Project API** - CRUD operations, stats
- **Task API** - CRUD operations, status updates, assignments
- **User API** - CRUD operations, authentication, password management
- **Cross-Service Integration** - Multi-service operations
- **Error Handling** - Connection errors, permission validation

**Run these tests:**
```bash
npm test -- integration
```

## 🔍 Understanding Test Output

### Test Report Format
```
PASS  lib/services/__tests__/projectService.test.js
  ProjectService
    getAccessibleProjects
      ✓ should return all projects if user is admin (15ms)
      ✓ should filter projects by user access if not admin (8ms)
      ✓ should respect pagination parameters (5ms)
    getProjectById
      ✓ should fetch and return project with full details (10ms)
    ...

Test Suites: 4 passed, 4 total
Tests:       125 passed, 125 total
Snapshots:   0 total
Time:        3.456s
```

### Coverage Report
```bash
npm run test:coverage
```

This generates a coverage report showing:
- **Statements**: Percentage of code statements executed
- **Branches**: Percentage of conditional branches tested
- **Functions**: Percentage of functions called
- **Lines**: Percentage of lines executed

## 📊 Writing New Tests

### Basic Test Structure

```javascript
describe('MyService', () => {
  beforeEach(() => {
    // Setup before each test
    jest.clearAllMocks()
  })

  describe('myMethod', () => {
    it('should do something specific', async () => {
      // Arrange - Setup test data
      const input = { foo: 'bar' }
      
      // Act - Call the function
      const result = await myService.myMethod(input)
      
      // Assert - Verify results
      expect(result).toEqual(expectedValue)
    })
  })
})
```

### Mocking External Dependencies

```javascript
// Mock a service
jest.mock('@/lib/services/projectService')

// Mock MongoDB models
jest.mock('@/models/Project')

// Setup mock return values
Project.find.mockReturnValue({
  select: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue([{ _id: '1', nom: 'Test' }])
})

// Setup mock to return a promise
projectService.getAccessibleProjects.mockResolvedValue([])

// Setup mock to throw error
projectService.createProject.mockRejectedValue(new Error('Failed'))
```

### Testing Async Functions

```javascript
it('should handle async operations', async () => {
  const mockService = jest.fn().mockResolvedValue({ success: true })
  
  const result = await myService.asyncMethod()
  
  expect(result).toEqual({ success: true })
  expect(mockService).toHaveBeenCalled()
})
```

### Testing Error Cases

```javascript
it('should throw error on invalid input', async () => {
  jest.mock('@/models/User')
  User.findOne.mockResolvedValue(null)
  
  await expect(
    userService.getUserByEmail('invalid')
  ).rejects.toThrow('User not found')
})
```

## ✅ Best Practices

### 1. Test Isolation
- Each test should be independent
- Use `beforeEach` and `afterEach` to clean up
- Mock external dependencies

```javascript
beforeEach(() => {
  jest.clearAllMocks()
})

afterEach(() => {
  // Cleanup if needed
})
```

### 2. Meaningful Test Names
✅ Good:
```javascript
it('should return only active users when filter is applied')
it('should throw error if email already exists')
```

❌ Bad:
```javascript
it('works')
it('test')
```

### 3. Test Coverage Targets
Aim for:
- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

```bash
npm run test:coverage
```

### 4. Test Data & Factories

Create reusable test data:

```javascript
const createMockProject = (overrides = {}) => ({
  _id: 'proj-123',
  nom: 'Test Project',
  chef_projet: 'user-1',
  ...overrides
})

const createMockTask = (overrides = {}) => ({
  _id: 'task-123',
  titre: 'Test Task',
  projet_id: 'proj-123',
  ...overrides
})
```

### 5. Testing Database Interactions

```javascript
// Mock MongoDB connection
jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined)
}))

// Mock MongoDB models
jest.mock('@/models/Project')

// Test query building
it('should call find with correct filter', async () => {
  Project.find.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([])
  })

  await projectService.getAccessibleProjects('user-123', {})

  expect(Project.find).toHaveBeenCalledWith({ archivé: false })
})
```

### 6. Testing API Endpoints

```javascript
describe('POST /api/projects', () => {
  it('should create project with valid data', async () => {
    const projectData = {
      nom: 'New Project',
      description: 'Test'
    }

    projectService.createProject.mockResolvedValue({
      _id: 'proj-123',
      ...projectData
    })

    const result = await projectService.createProject(projectData, 'user-123')
    
    expect(result.nom).toBe('New Project')
    expect(projectService.createProject).toHaveBeenCalledWith(
      projectData,
      'user-123'
    )
  })
})
```

## 🐛 Debugging Tests

### Run Specific Test File
```bash
npm test -- projectService
```

### Run Specific Test Case
```bash
npm test -- projectService -t "should return all projects"
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

Then press:
- `p` - Filter by filename
- `t` - Filter by test name
- `q` - Quit

### Verbose Output
```bash
npm run test:verbose
```

### Debug in Node
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
# Open chrome://inspect in Chrome browser
```

## 🔗 Integration Testing Checklist

- [ ] Test database connections
- [ ] Test service method calls
- [ ] Test error handling and edge cases
- [ ] Test permission/authorization
- [ ] Test pagination and filtering
- [ ] Test data validation
- [ ] Test transaction rollbacks on failure
- [ ] Test concurrent operations
- [ ] Test data relationships
- [ ] Test stats calculations

## 📈 Continuous Improvement

### Coverage Goals
```bash
# Generate coverage report
npm run test:coverage

# Watch for coverage improvements
npm run test:coverage -- --watch
```

### Common Coverage Issues

1. **Uncovered branches**: Test error conditions
2. **Uncovered functions**: Test all exported functions
3. **Uncovered lines**: Review logic paths

### Example: Improving Coverage

```javascript
// Before: No error test
it('should create task', async () => {
  taskService.createTask.mockResolvedValue({ _id: 'task-1' })
  const result = await taskService.createTask({}, 'user-1')
  expect(result._id).toBe('task-1')
})

// After: Added error test
describe('createTask', () => {
  it('should create task', async () => {
    taskService.createTask.mockResolvedValue({ _id: 'task-1' })
    const result = await taskService.createTask({}, 'user-1')
    expect(result._id).toBe('task-1')
  })

  it('should throw error if project does not exist', async () => {
    taskService.createTask.mockRejectedValue(new Error('Projet non trouvé'))
    await expect(taskService.createTask({}, 'user-1')).rejects.toThrow()
  })
})
```

## 🚀 Running Tests in CI/CD

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
      - run: npm run test:coverage
```

### Pre-commit Testing
```bash
# In .git/hooks/pre-commit
npm test -- --bail
```

## 📚 Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [MongoDB Testing with jest-mongodb](https://github.com/shelfio/jest-mongodb)

## 🆘 Troubleshooting

### Issue: "Cannot find module"
**Solution**: Check mock paths and ensure `jsconfig.json` has correct path aliases
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Issue: "Tests timeout"
**Solution**: Increase timeout or check for unresolved promises
```javascript
jest.setTimeout(10000) // 10 seconds
```

### Issue: "Mock not working"
**Solution**: Ensure mock is defined before import
```javascript
jest.mock('@/lib/mongodb') // Must be before imports
import connectDB from '@/lib/mongodb'
```

### Issue: "Cannot connect to MongoDB in tests"
**Solution**: Use mongodb-memory-server or mock connections
```javascript
jest.mock('@/lib/mongodb', () => ({
  default: jest.fn().mockResolvedValue(undefined)
}))
```

## 📞 Support

For issues or questions about testing:
1. Check the test files for examples
2. Review Jest documentation
3. Check mock setup in jest.setup.js
4. Run with `--verbose` flag for detailed output

---

**Last Updated**: December 2024
**Test Coverage**: 80%+
**Test Count**: 125+ tests
