// ============================================
// HELPER FUNCTIONS (must be defined FIRST)
// ============================================

const createQueryHelper = (defaultResult = null) => {
  const query = {
    _result: defaultResult,
    lean: jest.fn(function() {
      return Promise.resolve(this._result)
    }),
    populate: jest.fn(function() {
      return this
    }),
    exec: jest.fn(function() {
      return Promise.resolve(this._result)
    }),
    then: jest.fn(function(cb) {
      Promise.resolve(this._result).then(cb)
      return this
    }),
    select: jest.fn(function() {
      return this
    }),
    sort: jest.fn(function() {
      return this
    }),
    skip: jest.fn(function() {
      return this
    }),
    limit: jest.fn(function() {
      return this
    }),
    // Make the query thenable so await works on direct calls
    [Symbol.toStringTag]: 'Query'
  }
  // Make the query thenable for async/await
  query.then = function(resolve, reject) {
    return Promise.resolve(this._result).then(resolve, reject)
  }
  query.catch = function(reject) {
    return Promise.resolve(this._result).catch(reject)
  }
  return query
}

const createDocumentHelper = (data = {}) => {
  // Create document with all provided data
  const doc = {
    ...data,
    _id: data._id || `id_${Math.random()}`,
  }
  
  // Add save method
  doc.save = jest.fn().mockImplementation(function() {
    // Return the document itself so it can be chained
    return Promise.resolve(this)
  })
  
  // Add populate method
  doc.populate = jest.fn().mockImplementation(function() {
    // Return self for chaining
    return this
  })
  
  // Add toObject method that preserves all fields
  doc.toObject = jest.fn().mockImplementation(function() {
    const obj = {}
    Object.keys(this).forEach(key => {
      // Skip function properties
      if (typeof this[key] !== 'function') {
        obj[key] = this[key]
      }
    })
    return obj
  })
  
  // Add lean method
  doc.lean = jest.fn().mockImplementation(function() {
    return Promise.resolve(this)
  })
  
  return doc
}

// ============================================
// MONGOOSE MOCK (uses helpers defined above)
// ============================================

jest.mock('mongoose', () => {
  const ObjectId = function(id) {
    this._id = id
    this.toString = () => (id ? String(id) : '')
  }

  const Schema = function(definition) {
    this.obj = definition
    this.add = jest.fn(() => this)
    this.pre = jest.fn(() => this)
    this.post = jest.fn(() => this)
    this.statics = {}
    this.methods = {}
    this.index = jest.fn(() => this)
    // Virtual returns chainable object with get/set
    this.virtual = jest.fn(() => ({
      get: jest.fn(() => this),
      set: jest.fn(() => this)
    }))
    this.Types = {
      ObjectId,
      Mixed: {},
      String: String,
      Number: Number,
      Date: Date,
      Boolean: Boolean,
    }
  }

  Schema.Types = {
    ObjectId,
    Mixed: {},
    String: String,
    Number: Number,
    Date: Date,
    Boolean: Boolean,
  }

  const models = {}

  const model = function(name, _schema) {
    if (!models[name]) {
      const mockModel = jest.fn(function(data = {}) {
        return createDocumentHelper(data)
      })

      mockModel.mockImplementation(function(data = {}) {
        return createDocumentHelper(data)
      })

      mockModel.find = jest.fn(function() {
        return createQueryHelper([])
      })
      
      mockModel.findOne = jest.fn(function() {
        return createQueryHelper(null)
      })
      
      mockModel.findById = jest.fn(function() {
        return createQueryHelper(null)
      })
      
      mockModel.findByIdAndUpdate = jest.fn(function() {
        return createQueryHelper(null)
      })
      
      mockModel.findByIdAndDelete = jest.fn(function() {
        return createQueryHelper(null)
      })
      
      mockModel.create = jest.fn().mockResolvedValue(createDocumentHelper())
      mockModel.updateMany = jest.fn().mockResolvedValue({})
      mockModel.deleteMany = jest.fn().mockResolvedValue({})
      mockModel.aggregate = jest.fn(function() {
        return {
          exec: jest.fn().mockResolvedValue([]),
          then: jest.fn(function(cb) { cb([]); return this }),
        }
      })
      mockModel.countDocuments = jest.fn().mockResolvedValue(0)
      mockModel.exists = jest.fn().mockResolvedValue(null)

      models[name] = mockModel
    }
    return models[name]
  }

  return {
    Schema,
    model,
    models,
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    connection: {
      on: jest.fn(),
      once: jest.fn(),
    },
    Types: {
      ObjectId,
      Mixed: {},
    },
  }
})

// ============================================
// IMPORTS & OTHER MOCKS
// ============================================

import '@testing-library/jest-dom'

// Polyfill for TextEncoder (Node.js test environment)
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util')
  global.TextEncoder = TextEncoder
  global.TextDecoder = TextDecoder
}

// Mock jose library for JWT
jest.mock('jose', () => ({
  __esModule: true,
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue('mock.jwt.token'),
  })),
  jwtVerify: jest.fn().mockResolvedValue({ payload: {} }),
}), { virtual: true })

// Mock mongodb package
jest.mock('mongodb', () => ({
  __esModule: true,
  MongoClient: jest.fn(),
  Db: jest.fn(),
  Collection: jest.fn(),
}), { virtual: true })

// Mock MongoDB connection for tests
jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}))

// Mock next/router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    }
  },
}))

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    const React = require('react')
    return React.createElement('img', props)
  },
}))

// ============================================
// SETUP HOOKS
// ============================================

const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Reset mocks and query implementations between tests
beforeEach(() => {
  jest.clearAllMocks()
  
  // Re-initialize all model query methods to ensure .lean() is available
  const mongoose = require('mongoose')
  if (mongoose && mongoose.models) {
    Object.keys(mongoose.models).forEach(modelName => {
      const model = mongoose.models[modelName]
      if (model && typeof model === 'function') {
        // Restore proper implementations that return query objects
        model.find.mockImplementation(function() {
          return createQueryHelper([])
        })
        model.findOne.mockImplementation(function() {
          return createQueryHelper(null)
        })
        model.findById.mockImplementation(function() {
          return createQueryHelper(null)
        })
        model.findByIdAndUpdate.mockImplementation(function() {
          return createQueryHelper(null)
        })
        model.findByIdAndDelete.mockImplementation(function() {
          return createQueryHelper(null)
        })
      }
    })
  }
})
