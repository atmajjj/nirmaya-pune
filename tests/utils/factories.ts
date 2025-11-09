export interface TestUser {
  id?: number;
  email: string;
  password: string;
  name?: string;
  role?: string;
  created_by?: number;
  created_at?: Date;
}

export class TestDataFactory {
  static createUser(overrides: Partial<TestUser> = {}): TestUser {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);

    return {
      email: `testuser.${timestamp}.${random}@example.com`,
      password: 'TestPassword123!',
      name: `Test User ${random}`,
      created_by: 1,
      created_at: new Date(),
      ...overrides,
    };
  }

  static createMultipleUsers(count: number): TestUser[] {
    return Array.from({ length: count }, (_, index) =>
      this.createUser({
        email: `testuser.${Date.now()}.${index}@example.com`,
      })
    );
  }
}
