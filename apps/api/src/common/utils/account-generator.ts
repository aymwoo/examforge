// 考试账号模式枚举
export enum ExamAccountMode {
  PERMANENT = 'PERMANENT', // 使用固定学生账号
  TEMPORARY_IMPORT = 'TEMPORARY_IMPORT', // 临时账号-导入模式
  TEMPORARY_REGISTER = 'TEMPORARY_REGISTER', // 临时账号-自主注册模式
}

// 账号类型枚举
export enum AccountType {
  PERMANENT = 'PERMANENT', // 固定学生账号
  TEMPORARY = 'TEMPORARY', // 临时考试账号
}

// 账号生成工具类
export class AccountGenerator {
  // 生成固定学生账号用户名（使用学号）
  static generatePermanentUsername(studentId: string): string {
    return studentId; // 直接使用学号，如 "2024001"
  }

  // 生成临时考试账号用户名（易记忆格式）
  static generateTemporaryUsername(examTitle: string, identifier: string, index?: number): string {
    // 提取考试标题的关键字（取前2个汉字或4个字母）
    const examKey = this.extractExamKey(examTitle);

    // 如果有姓名，使用姓名；否则使用序号
    if (identifier && identifier !== `${index}`) {
      return `${examKey}_${identifier}`; // 如 "数学_张三"
    } else {
      const paddedIndex = `${index || 1}`.padStart(2, '0');
      return `${examKey}${paddedIndex}`; // 如 "数学01"
    }
  }

  // 为自主注册生成用户名（基于姓名和考试）
  static generateRegisterUsername(examTitle: string, studentName: string): string {
    const examKey = this.extractExamKey(examTitle);
    return `${examKey}_${studentName}`;
  }

  // 验证自主注册的用户名格式
  static validateRegisterUsername(username: string, examTitle: string): boolean {
    const examKey = this.extractExamKey(examTitle);
    return username.startsWith(`${examKey}_`) && username.length > examKey.length + 1;
  }

  // 提取考试关键字
  private static extractExamKey(examTitle: string): string {
    // 移除常见的考试相关词汇
    const cleanTitle = examTitle.replace(/考试|测试|测验|期中|期末|月考|周测/g, '').trim();

    // 如果是中文，取前2个字符
    if (/[\u4e00-\u9fa5]/.test(cleanTitle)) {
      return cleanTitle.substring(0, 2) || '考试';
    }

    // 如果是英文，取前4个字符
    const englishMatch = cleanTitle.match(/[a-zA-Z]+/);
    if (englishMatch) {
      return englishMatch[0].substring(0, 4).toLowerCase();
    }

    // 默认返回
    return 'exam';
  }

  // 检查用户名是否为固定账号（纯数字学号）
  static isPermanentAccount(username: string): boolean {
    return /^\d+$/.test(username); // 纯数字格式
  }

  // 检查用户名是否为临时账号
  static isTemporaryAccount(username: string): boolean {
    return (
      !this.isPermanentAccount(username) &&
      (username.includes('_') || /^[\u4e00-\u9fa5a-zA-Z]+\d{2}$/.test(username))
    );
  }

  // 验证用户名格式
  static validateUsername(username: string, accountType: AccountType): boolean {
    if (accountType === AccountType.PERMANENT) {
      return this.isPermanentAccount(username);
    } else {
      return this.isTemporaryAccount(username);
    }
  }

  // 生成易记忆的随机密码
  static generateMemorablePassword(): string {
    const adjectives = ['快乐', '聪明', '勇敢', '善良', '活泼', '可爱', '阳光', '温暖'];
    const numbers = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, '0');
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];

    return `${adjective}${numbers}`; // 如 "快乐23"
  }
}
