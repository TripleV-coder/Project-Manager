/**
 * Budget Service Tests
 * Tests for budget and expense management
 */

import Budget from '@/models/Budget'
import Project from '@/models/Project'
import connectDB from '@/lib/mongodb'

jest.mock('@/models/Budget')
jest.mock('@/models/Project')
jest.mock('@/lib/mongodb')

// Budget service
class BudgetService {
  async getProjectBudget(projectId) {
    await connectDB()

    const project = await Project.findById(projectId).select('budget').lean()
    return project?.budget || null
  }

  async getProjectExpenses(projectId, dateStart = null, dateEnd = null) {
    await connectDB()

    const query = { projet_id: projectId }

    if (dateStart || dateEnd) {
      query.date_dépense = {}
      if (dateStart) query.date_dépense.$gte = dateStart
      if (dateEnd) query.date_dépense.$lte = dateEnd
    }

    return Budget.find(query)
      .populate('saisi_par', 'nom_complet')
      .populate('validé_par', 'nom_complet')
      .sort({ date_dépense: -1 })
      .lean()
  }

  async createExpense(data, userId) {
    await connectDB()

    const project = await Project.findById(data.projet_id).select('_id').lean()
    if (!project) throw new Error('Projet non trouvé')

    const expense = new Budget({
      projet_id: data.projet_id,
      catégorie: data.catégorie,
      description: data.description,
      montant: data.montant,
      devise: data.devise || 'FCFA',
      type: data.type || 'externe',
      date_dépense: data.date_dépense,
      fournisseur: data.fournisseur,
      numéro_facture: data.numéro_facture,
      saisi_par: userId,
      statut: 'en_attente'
    })

    await expense.save()
    await expense.populate('saisi_par', 'nom_complet')

    return expense.toObject()
  }

  async updateExpense(expenseId, data) {
    await connectDB()

    return Budget.findByIdAndUpdate(
      expenseId,
      { ...data, updated_at: new Date() },
      { new: true, runValidators: true }
    )
      .populate('saisi_par', 'nom_complet')
      .populate('validé_par', 'nom_complet')
      .lean()
  }

  async validateExpense(expenseId, approverId, approved = true) {
    await connectDB()

    return Budget.findByIdAndUpdate(
      expenseId,
      {
        statut: approved ? 'validé' : 'refusé',
        validé_par: approverId,
        date_validation: new Date()
      },
      { new: true }
    ).lean()
  }

  async getBudgetStats(projectId, dateStart = null, dateEnd = null) {
    await connectDB()

    const query = { projet_id: projectId }

    if (dateStart || dateEnd) {
      query.date_dépense = {}
      if (dateStart) query.date_dépense.$gte = dateStart
      if (dateEnd) query.date_dépense.$lte = dateEnd
    }

    const expenses = await Budget.find(query).lean()
    const project = await Project.findById(projectId).select('budget').lean()

    const validated = expenses.filter(e => e.statut === 'validé')
    const byCategory = {}

    expenses.forEach(expense => {
      if (!byCategory[expense.catégorie]) {
        byCategory[expense.catégorie] = {
          total: 0,
          validated: 0,
          pending: 0,
          rejected: 0
        }
      }
      byCategory[expense.catégorie].total += expense.montant
      if (expense.statut === 'validé') {
        byCategory[expense.catégorie].validated += expense.montant
      } else if (expense.statut === 'en_attente') {
        byCategory[expense.catégorie].pending += expense.montant
      } else if (expense.statut === 'refusé') {
        byCategory[expense.catégorie].rejected += expense.montant
      }
    })

    return {
      budget_prévisionnel: project?.budget?.prévisionnel || 0,
      budget_réel: project?.budget?.réel || 0,
      total_expenses: expenses.reduce((sum, e) => sum + e.montant, 0),
      validated_expenses: validated.reduce((sum, e) => sum + e.montant, 0),
      pending_expenses: expenses
        .filter(e => e.statut === 'en_attente')
        .reduce((sum, e) => sum + e.montant, 0),
      rejected_expenses: expenses
        .filter(e => e.statut === 'refusé')
        .reduce((sum, e) => sum + e.montant, 0),
      expenses_count: expenses.length,
      validated_count: validated.length,
      by_category: byCategory
    }
  }

  async deleteExpense(expenseId) {
    await connectDB()

    const expense = await Budget.findById(expenseId)
    if (!expense) return null

    await Budget.findByIdAndDelete(expenseId)
    return expense
  }

  async getExpensesByCategory(projectId, category) {
    await connectDB()

    return Budget.find({
      projet_id: projectId,
      catégorie: category
    })
      .populate('saisi_par', 'nom_complet')
      .lean()
  }

  async updateProjectBudget(projectId, budget) {
    await connectDB()

    return Project.findByIdAndUpdate(
      projectId,
      { budget },
      { new: true }
    ).select('budget').lean()
  }
}

describe('BudgetService', () => {
  let budgetService

  beforeEach(() => {
    jest.clearAllMocks()
    connectDB.mockResolvedValue(undefined)
    budgetService = new BudgetService()
  })

  describe('getProjectBudget', () => {
    it('should return project budget', async () => {
      const projectId = 'proj-123'
      const mockBudget = {
        prévisionnel: 100000,
        réel: 45000,
        devise: 'FCFA'
      }

      Project.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ budget: mockBudget })
      })

      const result = await budgetService.getProjectBudget(projectId)

      expect(result).toEqual(mockBudget)
    })

    it('should return null if project has no budget', async () => {
      Project.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({})
      })

      const result = await budgetService.getProjectBudget('proj-123')

      expect(result).toBeNull()
    })
  })

  describe('getProjectExpenses', () => {
    it('should return all project expenses', async () => {
      const projectId = 'proj-123'
      const mockExpenses = [
        { _id: 'exp-1', montant: 5000, catégorie: 'Matériel' },
        { _id: 'exp-2', montant: 3000, catégorie: 'Service' }
      ]

      Budget.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockExpenses)
      })

      const result = await budgetService.getProjectExpenses(projectId)

      expect(result).toEqual(mockExpenses)
    })

    it('should filter expenses by date range', async () => {
      const projectId = 'proj-123'
      const dateStart = new Date('2024-01-01')
      const dateEnd = new Date('2024-01-31')

      Budget.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      })

      await budgetService.getProjectExpenses(projectId, dateStart, dateEnd)

      expect(Budget.find).toHaveBeenCalledWith(
        expect.objectContaining({
          date_dépense: { $gte: dateStart, $lte: dateEnd }
        })
      )
    })
  })

  describe('createExpense', () => {
    it('should create expense entry', async () => {
      const userId = 'user-123'
      const projectId = 'proj-456'

      const data = {
        projet_id: projectId,
        catégorie: 'Matériel',
        description: 'Laptop purchase',
        montant: 5000,
        date_dépense: new Date('2024-01-15'),
        fournisseur: 'Dell Inc'
      }

      Project.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ _id: projectId })
      })

      const mockExpense = {
        ...data,
        _id: 'exp-123',
        saisi_par: userId,
        statut: 'en_attente',
        save: jest.fn().mockResolvedValue(undefined),
        populate: jest.fn().mockReturnThis(),
        toObject: jest.fn().mockReturnValue({
          ...data,
          _id: 'exp-123',
          statut: 'en_attente'
        })
      }

      Budget.mockImplementation(() => mockExpense)

      const result = await budgetService.createExpense(data, userId)

      expect(result.montant).toBe(5000)
      expect(result.statut).toBe('en_attente')
      expect(mockExpense.save).toHaveBeenCalled()
    })

    it('should throw error if project not found', async () => {
      Project.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null)
      })

      const data = {
        projet_id: 'nonexistent',
        catégorie: 'Matériel',
        description: 'Test',
        montant: 1000,
        date_dépense: new Date()
      }

      await expect(
        budgetService.createExpense(data, 'user-123')
      ).rejects.toThrow('Projet non trouvé')
    })

    it('should set default values', async () => {
      Project.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ _id: 'proj-123' })
      })

      const mockExpense = {
        save: jest.fn().mockResolvedValue(undefined),
        populate: jest.fn().mockReturnThis(),
        toObject: jest.fn().mockReturnValue({})
      }

      Budget.mockImplementation(() => mockExpense)

      const data = {
        projet_id: 'proj-123',
        catégorie: 'Service',
        description: 'Test',
        montant: 1000,
        date_dépense: new Date()
      }

      await budgetService.createExpense(data, 'user-123')

      expect(Budget).toHaveBeenCalledWith(
        expect.objectContaining({
          devise: 'FCFA',
          type: 'externe',
          statut: 'en_attente'
        })
      )
    })
  })

  describe('validateExpense', () => {
    it('should validate expense', async () => {
      const expenseId = 'exp-123'
      const approverId = 'user-456'

      const mockExpense = {
        _id: expenseId,
        statut: 'validé'
      }

      Budget.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockExpense)
      })

      const result = await budgetService.validateExpense(expenseId, approverId, true)

      expect(result.statut).toBe('validé')
    })

    it('should reject expense', async () => {
      const mockExpense = {
        _id: 'exp-123',
        statut: 'refusé'
      }

      Budget.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockExpense)
      })

      const result = await budgetService.validateExpense('exp-123', 'user-456', false)

      expect(result.statut).toBe('refusé')
    })
  })

  describe('getBudgetStats', () => {
    it('should return budget statistics', async () => {
      const projectId = 'proj-123'
      const mockExpenses = [
        { _id: 'exp-1', montant: 5000, catégorie: 'Matériel', statut: 'validé' },
        { _id: 'exp-2', montant: 3000, catégorie: 'Service', statut: 'validé' },
        { _id: 'exp-3', montant: 2000, catégorie: 'Matériel', statut: 'en_attente' },
        { _id: 'exp-4', montant: 1000, catégorie: 'Service', statut: 'refusé' }
      ]

      Budget.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockExpenses)
      })

      Project.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({
          budget: {
            prévisionnel: 50000,
            réel: 11000
          }
        })
      })

      const result = await budgetService.getBudgetStats(projectId)

      expect(result.total_expenses).toBe(11000)
      expect(result.validated_expenses).toBe(8000)
      expect(result.pending_expenses).toBe(2000)
      expect(result.rejected_expenses).toBe(1000)
      expect(result.expenses_count).toBe(4)
      expect(result.validated_count).toBe(2)
    })

    it('should group expenses by category', async () => {
      const mockExpenses = [
        { _id: 'exp-1', montant: 5000, catégorie: 'Matériel', statut: 'validé' },
        { _id: 'exp-2', montant: 2000, catégorie: 'Matériel', statut: 'en_attente' },
        { _id: 'exp-3', montant: 3000, catégorie: 'Service', statut: 'validé' }
      ]

      Budget.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockExpenses)
      })

      Project.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ budget: {} })
      })

      const result = await budgetService.getBudgetStats('proj-123')

      expect(result.by_category['Matériel']).toEqual({
        total: 7000,
        validated: 5000,
        pending: 2000,
        rejected: 0
      })

      expect(result.by_category['Service']).toEqual({
        total: 3000,
        validated: 3000,
        pending: 0,
        rejected: 0
      })
    })
  })

  describe('deleteExpense', () => {
    it('should delete expense', async () => {
      const expenseId = 'exp-123'
      const mockExpense = {
        _id: expenseId,
        montant: 5000
      }

      Budget.findById.mockResolvedValue(mockExpense)
      Budget.findByIdAndDelete.mockResolvedValue(mockExpense)

      const result = await budgetService.deleteExpense(expenseId)

      expect(result).toEqual(mockExpense)
      expect(Budget.findByIdAndDelete).toHaveBeenCalledWith(expenseId)
    })

    it('should return null if expense not found', async () => {
      Budget.findById.mockResolvedValue(null)

      const result = await budgetService.deleteExpense('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('getExpensesByCategory', () => {
    it('should return expenses for specific category', async () => {
      const projectId = 'proj-123'
      const category = 'Matériel'

      const mockExpenses = [
        { _id: 'exp-1', catégorie: 'Matériel', montant: 5000 },
        { _id: 'exp-2', catégorie: 'Matériel', montant: 2000 }
      ]

      Budget.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockExpenses)
      })

      const result = await budgetService.getExpensesByCategory(projectId, category)

      expect(result).toEqual(mockExpenses)
      expect(Budget.find).toHaveBeenCalledWith({
        projet_id: projectId,
        catégorie: category
      })
    })
  })

  describe('updateProjectBudget', () => {
    it('should update project budget', async () => {
      const projectId = 'proj-123'
      const newBudget = {
        prévisionnel: 150000,
        réel: 50000,
        devise: 'FCFA'
      }

      const mockProject = {
        budget: newBudget
      }

      Project.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProject)
      })

      const result = await budgetService.updateProjectBudget(projectId, newBudget)

      expect(result.budget).toEqual(newBudget)
      expect(Project.findByIdAndUpdate).toHaveBeenCalledWith(
        projectId,
        { budget: newBudget },
        expect.any(Object)
      )
    })
  })
})
