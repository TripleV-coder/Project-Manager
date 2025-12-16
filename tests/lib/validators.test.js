import { validate, userValidation, projectValidation, taskValidation, sanitizeQuery } from '@/lib/validators';

describe('Input validators', () => {
  describe('User validation', () => {
    test('should validate correct user data', () => {
      const validData = {
        nom_complet: 'John Doe',
        email: 'john@example.com',
        password: 'TestPassword123!'
      };

      const result = validate(userValidation, validData);
      expect(result).toHaveProperty('nom_complet', 'John Doe');
      expect(result).toHaveProperty('email', 'john@example.com');
    });

    test('should reject invalid email', () => {
      const invalidData = {
        nom_complet: 'John Doe',
        email: 'invalid-email',
        password: 'TestPassword123!'
      };

      expect(() => {
        validate(userValidation, invalidData);
      }).toThrow();
    });

    test('should reject weak password', () => {
      const invalidData = {
        nom_complet: 'John Doe',
        email: 'john@example.com',
        password: 'weak'
      };

      expect(() => {
        validate(userValidation, invalidData);
      }).toThrow();
    });

    test('should reject short name', () => {
      const invalidData = {
        nom_complet: 'Jo',
        email: 'john@example.com',
        password: 'TestPassword123!'
      };

      expect(() => {
        validate(userValidation, invalidData);
      }).toThrow();
    });
  });

  describe('Project validation', () => {
    const validProjectData = {
      nom: 'Test Project',
      description: 'A test project',
      template_id: '507f1f77bcf86cd799439011',
      date_début: new Date(),
      date_fin_prévue: new Date(Date.now() + 86400000),
      chef_projet: '507f1f77bcf86cd799439011'
    };

    test('should validate correct project data', () => {
      const result = validate(projectValidation, validProjectData);
      expect(result).toHaveProperty('nom', 'Test Project');
    });

    test('should reject missing template_id', () => {
      const invalidData = {
        nom: 'Test Project',
        description: 'A test project'
      };

      expect(() => {
        validate(projectValidation, invalidData);
      }).toThrow();
    });

    test('should reject invalid chef_projet ID', () => {
      const invalidData = {
        ...validProjectData,
        chef_projet: 'invalid-id'
      };

      expect(() => {
        validate(projectValidation, invalidData);
      }).toThrow();
    });

    test('should reject invalid template_id', () => {
      const invalidData = {
        ...validProjectData,
        template_id: 'invalid-id'
      };

      expect(() => {
        validate(projectValidation, invalidData);
      }).toThrow();
    });
  });

  describe('Task validation', () => {
    const validTaskData = {
      titre: 'Test Task',
      description: 'Task description',
      projet_id: '507f1f77bcf86cd799439011'
    };

    test('should validate correct task data', () => {
      const result = validate(taskValidation, validTaskData);
      expect(result).toHaveProperty('titre', 'Test Task');
    });

    test('should reject short title', () => {
      const invalidData = {
        ...validTaskData,
        titre: 'T'
      };

      expect(() => {
        validate(taskValidation, invalidData);
      }).toThrow();
    });

    test('should set default priority', () => {
      const result = validate(taskValidation, validTaskData);
      expect(result.priorité).toBe('Moyenne');
    });

    test('should set default status', () => {
      const result = validate(taskValidation, validTaskData);
      expect(result.statut).toBe('Backlog');
    });

    test('should reject invalid priority', () => {
      const invalidData = {
        ...validTaskData,
        priorité: 'invalid'
      };

      expect(() => {
        validate(taskValidation, invalidData);
      }).toThrow();
    });

    test('should set default type', () => {
      const result = validate(taskValidation, validTaskData);
      expect(result.type).toBe('Tâche');
    });
  });

  describe('Query sanitization', () => {
    test('should remove MongoDB operators', () => {
      const query = {
        nom: 'Test',
        $where: 'this.price < 100',
        $ne: 'value'
      };

      const sanitized = sanitizeQuery(query);
      expect(sanitized).toHaveProperty('nom', 'Test');
      expect(sanitized).not.toHaveProperty('$where');
      expect(sanitized).not.toHaveProperty('$ne');
    });

    test('should handle nested objects', () => {
      const query = {
        user: {
          email: 'test@example.com',
          $exists: true
        }
      };

      const sanitized = sanitizeQuery(query);
      expect(sanitized.user).toHaveProperty('email');
      expect(sanitized.user).not.toHaveProperty('$exists');
    });

    test('should preserve non-operator fields', () => {
      const query = {
        nom: 'Test',
        email: 'test@example.com',
        age: 25
      };

      const sanitized = sanitizeQuery(query);
      expect(sanitized).toEqual(query);
    });
  });
});
