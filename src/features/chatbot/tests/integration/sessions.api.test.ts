/**
 * Sessions & Chat API Integration Tests
 *
 * Tests for session and message endpoints:
 * - POST /api/chatbot/chat - Send message
 * - GET /api/chatbot/sessions - List sessions
 * - GET /api/chatbot/sessions/:id - Get session with messages
 * - DELETE /api/chatbot/sessions/:id - Delete session
 */

import { Application } from 'express';
import { sql } from 'drizzle-orm';
import App from '../../../../app';
import ChatbotRoute from '../../index';
import AuthRoute from '../../../auth';
import { dbHelper } from '../../../../../tests/utils/database.helper';
import { ApiTestHelper } from '../../../../../tests/utils/api.helper';
import { AuthTestHelper } from '../../../../../tests/utils/auth.helper';
import { db } from '../../../../database/drizzle';
import { chatbotSessions, chatbotMessages, chatbotDocuments } from '../../shared/schema';

describe('Sessions & Chat API Integration Tests', () => {
  let app: Application;
  let apiHelper: ApiTestHelper;
  let userToken: string;
  let userId: number;
  let otherUserToken: string;
  let otherUserId: number;

  beforeAll(async () => {
    const chatbotRoute = new ChatbotRoute();
    const authRoute = new AuthRoute();
    const appInstance = new App([authRoute, chatbotRoute]);
    app = appInstance.getServer();
    apiHelper = new ApiTestHelper(app as any);
  });

  beforeEach(async () => {
    // Clean up tables
    await db.execute(sql`TRUNCATE TABLE chatbot_messages CASCADE`);
    await db.execute(sql`TRUNCATE TABLE chatbot_sessions CASCADE`);
    await db.execute(sql`TRUNCATE TABLE chatbot_documents CASCADE`);
    await dbHelper.cleanup();
    await dbHelper.resetSequences();

    // Reset chatbot sequences
    await db.execute(sql`ALTER SEQUENCE chatbot_sessions_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE chatbot_messages_id_seq RESTART WITH 1`);

    // Create user and get token
    const { user, token } = await AuthTestHelper.createTestUser({
      email: 'user@example.com',
      password: 'UserPass123!',
      name: 'Test User',
      role: 'researcher',
    });
    userToken = token;
    userId = user.id;

    // Create another user for isolation tests
    const { user: other, token: otherToken } = await AuthTestHelper.createTestUser({
      email: 'other@example.com',
      password: 'OtherPass123!',
      name: 'Other User',
      role: 'researcher',
    });
    otherUserToken = otherToken;
    otherUserId = other.id;
  });

  afterAll(async () => {
    await dbHelper.close();
  });

  describe('GET /api/chatbot/sessions', () => {
    it('should list user sessions', async () => {
      // Create sessions for the user
      await db.insert(chatbotSessions).values([
        {
          user_id: userId,
          title: 'Session 1',
          created_by: userId,
          updated_by: userId,
        },
        {
          user_id: userId,
          title: 'Session 2',
          created_by: userId,
          updated_by: userId,
        },
      ]);

      const response = await apiHelper.get('/api/chatbot/sessions', userToken);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.pagination.total).toBe(2);
    });

    it('should paginate sessions correctly', async () => {
      // Create 5 sessions
      for (let i = 0; i < 5; i++) {
        await db.insert(chatbotSessions).values({
          user_id: userId,
          title: `Session ${i}`,
          created_by: userId,
          updated_by: userId,
        });
      }

      const response = await apiHelper.get('/api/chatbot/sessions?page=1&limit=2', userToken);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.pagination.total).toBe(5);
      expect(response.body.meta.pagination.page).toBe(1);
    });

    it('should only list own sessions (not other users)', async () => {
      // Create session for current user
      await db.insert(chatbotSessions).values({
        user_id: userId,
        title: 'My Session',
        created_by: userId,
        updated_by: userId,
      });

      // Create session for other user
      await db.insert(chatbotSessions).values({
        user_id: otherUserId,
        title: 'Other Session',
        created_by: otherUserId,
        updated_by: otherUserId,
      });

      const response = await apiHelper.get('/api/chatbot/sessions', userToken);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('My Session');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await apiHelper.get('/api/chatbot/sessions');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/chatbot/sessions/:id', () => {
    it('should get session with messages', async () => {
      // Create session
      const [session] = await db
        .insert(chatbotSessions)
        .values({
          user_id: userId,
          title: 'My Session',
          created_by: userId,
          updated_by: userId,
        })
        .returning();

      // Add messages
      await db.insert(chatbotMessages).values([
        {
          session_id: session.id,
          role: 'user',
          content: 'Hello',
          created_by: userId,
          updated_by: userId,
        },
        {
          session_id: session.id,
          role: 'assistant',
          content: 'Hi there!',
          created_by: userId,
          updated_by: userId,
        },
      ]);

      const response = await apiHelper.get(`/api/chatbot/sessions/${session.id}`, userToken);

      expect(response.status).toBe(200);
      expect(response.body.data.session.id).toBe(session.id);
      expect(response.body.data.session.title).toBe('My Session');
      expect(response.body.data.messages).toHaveLength(2);
      expect(response.body.data.messages[0].role).toBe('user');
      expect(response.body.data.messages[1].role).toBe('assistant');
    });

    it('should return 404 for non-existent session', async () => {
      const response = await apiHelper.get('/api/chatbot/sessions/999', userToken);

      expect(response.status).toBe(404);
    });

    it('should not allow access to other user sessions', async () => {
      // Create session for other user
      const [session] = await db
        .insert(chatbotSessions)
        .values({
          user_id: otherUserId,
          title: 'Other Session',
          created_by: otherUserId,
          updated_by: otherUserId,
        })
        .returning();

      const response = await apiHelper.get(`/api/chatbot/sessions/${session.id}`, userToken);

      expect(response.status).toBe(404);
    });

    it('should reject invalid session ID', async () => {
      const response = await apiHelper.get('/api/chatbot/sessions/invalid', userToken);

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/chatbot/sessions/:id', () => {
    it('should soft delete session and messages', async () => {
      // Create session with messages
      const [session] = await db
        .insert(chatbotSessions)
        .values({
          user_id: userId,
          title: 'To Delete',
          created_by: userId,
          updated_by: userId,
        })
        .returning();

      await db.insert(chatbotMessages).values({
        session_id: session.id,
        role: 'user',
        content: 'Hello',
        created_by: userId,
        updated_by: userId,
      });

      const response = await apiHelper.delete(`/api/chatbot/sessions/${session.id}`, userToken);

      expect(response.status).toBe(204);

      // Verify session is deleted (not visible in list)
      const listResponse = await apiHelper.get('/api/chatbot/sessions', userToken);
      expect(listResponse.body.data).toHaveLength(0);
    });

    it('should return 404 for non-existent session', async () => {
      const response = await apiHelper.delete('/api/chatbot/sessions/999', userToken);

      expect(response.status).toBe(404);
    });

    it('should not allow deleting other user sessions', async () => {
      // Create session for other user
      const [session] = await db
        .insert(chatbotSessions)
        .values({
          user_id: otherUserId,
          title: 'Protected',
          created_by: otherUserId,
          updated_by: otherUserId,
        })
        .returning();

      const response = await apiHelper.delete(`/api/chatbot/sessions/${session.id}`, userToken);

      expect(response.status).toBe(404);
    });
  });

  // Note: POST /api/chatbot/chat tests require mocking external services
  // (Pinecone, HuggingFace, Groq) which should be done in separate test file
  describe('POST /api/chatbot/chat', () => {
    it('should reject empty message', async () => {
      const response = await apiHelper.post('/api/chatbot/chat', { message: '' }, userToken);

      expect(response.status).toBe(400);
    });

    it('should reject request without message', async () => {
      const response = await apiHelper.post('/api/chatbot/chat', {}, userToken);

      expect(response.status).toBe(400);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await apiHelper.post('/api/chatbot/chat', { message: 'Hello' });

      expect(response.status).toBe(401);
    });

    it('should reject invalid session ID', async () => {
      const response = await apiHelper.post(
        '/api/chatbot/chat',
        { message: 'Hello', sessionId: 'invalid' },
        userToken
      );

      expect(response.status).toBe(400);
    });

    it('should reject non-existent session ID', async () => {
      const response = await apiHelper.post(
        '/api/chatbot/chat',
        { message: 'Hello', sessionId: 999 },
        userToken
      );

      expect(response.status).toBe(404);
    });

    it('should reject session owned by another user', async () => {
      // Create session for other user
      const [session] = await db
        .insert(chatbotSessions)
        .values({
          user_id: otherUserId,
          title: 'Other Session',
          created_by: otherUserId,
          updated_by: otherUserId,
        })
        .returning();

      const response = await apiHelper.post(
        '/api/chatbot/chat',
        { message: 'Hello', sessionId: session.id },
        userToken
      );

      expect(response.status).toBe(404);
    });
  });
});
