import { AccountGenerator, AccountType } from './account-generator';

describe('AccountGenerator', () => {
  describe('generatePermanentUsername', () => {
    it('should return studentId as username', () => {
      const studentId = '2024001';
      expect(AccountGenerator.generatePermanentUsername(studentId)).toBe(studentId);
    });
  });

  describe('generateTemporaryUsername', () => {
    it('should extract 2 Chinese characters for Chinese exam titles', () => {
      expect(AccountGenerator.generateTemporaryUsername('数学考试', '张三')).toBe('数学_张三');
      expect(AccountGenerator.generateTemporaryUsername('语文测试', '李四')).toBe('语文_李四');
    });

    it('should extract 4 characters for English exam titles', () => {
      expect(AccountGenerator.generateTemporaryUsername('Mathematics Exam', 'John')).toBe('math_John');
      expect(AccountGenerator.generateTemporaryUsername('Physics Test', 'Jane')).toBe('phys_Jane');
    });

    it('should remove common exam words', () => {
      expect(AccountGenerator.generateTemporaryUsername('复习期末考试', '1', 1)).toBe('复习01');
      expect(AccountGenerator.generateTemporaryUsername('范围月考测试', '2', 2)).toBe('范围02');
    });

    it('should use identifier if provided and different from index', () => {
      expect(AccountGenerator.generateTemporaryUsername('数学', '张三', 1)).toBe('数学_张三');
    });

    it('should use padded index if identifier is not provided or same as index', () => {
      expect(AccountGenerator.generateTemporaryUsername('数学', '1', 1)).toBe('数学01');
      expect(AccountGenerator.generateTemporaryUsername('数学', '', 5)).toBe('数学05');
      // @ts-ignore
      expect(AccountGenerator.generateTemporaryUsername('数学', null, 10)).toBe('数学10');
    });

    it('should default to "exam" if no title key found', () => {
      expect(AccountGenerator.generateTemporaryUsername('!!!', '1', 1)).toBe('exam01');
    });
  });

  describe('generateRegisterUsername', () => {
    it('should return combined exam key and student name', () => {
      expect(AccountGenerator.generateRegisterUsername('数学考试', '张三')).toBe('数学_张三');
    });
  });

  describe('validateRegisterUsername', () => {
    it('should return true for valid registration usernames', () => {
      expect(AccountGenerator.validateRegisterUsername('数学_张三', '数学考试')).toBe(true);
    });

    it('should return false if prefix does not match exam key', () => {
      expect(AccountGenerator.validateRegisterUsername('语文_张三', '数学考试')).toBe(false);
    });

    it('should return false if name part is missing', () => {
      expect(AccountGenerator.validateRegisterUsername('数学_', '数学考试')).toBe(false);
    });
  });

  describe('isPermanentAccount', () => {
    it('should return true for numeric strings', () => {
      expect(AccountGenerator.isPermanentAccount('123456')).toBe(true);
    });

    it('should return false for non-numeric strings', () => {
      expect(AccountGenerator.isPermanentAccount('abc123')).toBe(false);
      expect(AccountGenerator.isPermanentAccount('数学_123')).toBe(false);
    });
  });

  describe('isTemporaryAccount', () => {
    it('should return true for usernames with underscores', () => {
      expect(AccountGenerator.isTemporaryAccount('数学_张三')).toBe(true);
    });

    it('should return true for usernames with text and 2 digits', () => {
      expect(AccountGenerator.isTemporaryAccount('数学01')).toBe(true);
      expect(AccountGenerator.isTemporaryAccount('math05')).toBe(true);
    });

    it('should return false for permanent accounts', () => {
      expect(AccountGenerator.isTemporaryAccount('123456')).toBe(false);
    });
  });

  describe('validateUsername', () => {
    it('should validate permanent accounts correctly', () => {
      expect(AccountGenerator.validateUsername('12345', AccountType.PERMANENT)).toBe(true);
      expect(AccountGenerator.validateUsername('abc', AccountType.PERMANENT)).toBe(false);
    });

    it('should validate temporary accounts correctly', () => {
      expect(AccountGenerator.validateUsername('数学_123', AccountType.TEMPORARY)).toBe(true);
      expect(AccountGenerator.validateUsername('数学01', AccountType.TEMPORARY)).toBe(true);
      expect(AccountGenerator.validateUsername('12345', AccountType.TEMPORARY)).toBe(false);
    });
  });

  describe('generateMemorablePassword', () => {
    it('should return a string with adjective and 2 digits', () => {
      const password = AccountGenerator.generateMemorablePassword();
      const adjectives = ['快乐', '聪明', '勇敢', '善良', '活泼', '可爱', '阳光', '温暖'];

      const adjective = adjectives.find(a => password.startsWith(a));
      expect(adjective).toBeDefined();

      const digits = password.substring(adjective!.length);
      expect(digits).toMatch(/^\d{2}$/);
    });
  });
});
