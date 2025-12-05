/**
 * Integration tests for Formula Editor CRUD operations
 * 
 * Tests all formula endpoints with database interactions
 */

import { Application } from 'express';
import { sql } from 'drizzle-orm';
import App from '../../../../app';
import FormulaEditorRoute from '../../index';
import AuthRoute from '../../../auth';
import { dbHelper } from '../../../../../tests/utils/database.helper';
import { ApiTestHelper } from '../../../../../tests/utils/api.helper';
import { AuthTestHelper } from '../../../../../tests/utils/auth.helper';
import { db } from '../../../../database/drizzle';
import { formulas } from '../../shared/schema';
import {
  SAMPLE_HPI_FORMULA,
  SAMPLE_MI_FORMULA,
  SAMPLE_WQI_FORMULA,
  INVALID_FORMULAS,
  UPDATE_PAYLOADS,
  API_PATHS,
} from './fixtures';

describe('Formula Editor API', () => {
  let app: Application;
  let apiHelper: ApiTestHelper;
  let adminToken: string;
  let scientistToken: string;
  let researcherToken: string;

  beforeAll(async () => {
    const formulaRoute = new FormulaEditorRoute();
    const authRoute = new AuthRoute();
    const appInstance = new App([authRoute, formulaRoute]);
    app = appInstance.getServer();
    apiHelper = new ApiTestHelper(app as any);
  });

  beforeEach(async () => {
    // Clean up formulas table
    await db.execute(sql`TRUNCATE TABLE formulas CASCADE`);
    await db.execute(sql`ALTER SEQUENCE formulas_id_seq RESTART WITH 1`);
    await dbHelper.cleanup();
    await dbHelper.resetSequences();

    // Create test users
    const { token: aToken } = await AuthTestHelper.createTestUser({
      email: 'formula-admin@test.com',
      password: 'AdminPass123!',
      name: 'Admin User',
      role: 'admin',
    });
    adminToken = aToken;

    const { token: sToken } = await AuthTestHelper.createTestUser({
      email: 'formula-scientist@test.com',
      password: 'ScientistPass123!',
      name: 'Scientist User',
      role: 'scientist',
    });
    scientistToken = sToken;

    const { token: rToken } = await AuthTestHelper.createTestUser({
      email: 'formula-researcher@test.com',
      password: 'ResearcherPass123!',
      name: 'Researcher User',
      role: 'researcher',
    });
    researcherToken = rToken;
  });

  afterAll(async () => {
    await dbHelper.close();
  });

  // ============================================================================
  // POST /api/formulas - Create Formula
  // ============================================================================
  describe('POST /api/formulas', () => {
    describe('Authentication & Authorization', () => {
      it('should return 401 without authentication', async () => {
        const response = await apiHelper.post(API_PATHS.formulas, SAMPLE_HPI_FORMULA);
        expect(response.status).toBe(401);
      });

      it('should return 403 for researcher role', async () => {
        const response = await apiHelper.post(API_PATHS.formulas, SAMPLE_HPI_FORMULA, researcherToken);
        expect(response.status).toBe(403);
      });

      it('should allow admin to create formula', async () => {
        const response = await apiHelper.post(API_PATHS.formulas, SAMPLE_HPI_FORMULA, adminToken);
        expect(response.status).toBe(201);
        expect(response.body.data.name).toBe(SAMPLE_HPI_FORMULA.name);
      });

      it('should allow scientist to create formula', async () => {
        const response = await apiHelper.post(API_PATHS.formulas, SAMPLE_HPI_FORMULA, scientistToken);
        expect(response.status).toBe(201);
        expect(response.body.data.name).toBe(SAMPLE_HPI_FORMULA.name);
      });
    });

    describe('Validation', () => {
      it('should reject formula without name', async () => {
        const response = await apiHelper.post(API_PATHS.formulas, INVALID_FORMULAS.missingName, adminToken);
        expect(response.status).toBe(400);
      });

      it('should reject formula without type', async () => {
        const response = await apiHelper.post(API_PATHS.formulas, INVALID_FORMULAS.missingType, adminToken);
        expect(response.status).toBe(400);
      });

      it('should reject formula with invalid type', async () => {
        const response = await apiHelper.post(API_PATHS.formulas, INVALID_FORMULAS.invalidType, adminToken);
        expect(response.status).toBe(400);
      });

      it('should reject formula with empty parameters', async () => {
        const response = await apiHelper.post(API_PATHS.formulas, INVALID_FORMULAS.emptyParameters, adminToken);
        expect(response.status).toBe(400);
      });

      it('should reject formula with empty classification ranges', async () => {
        const response = await apiHelper.post(API_PATHS.formulas, INVALID_FORMULAS.emptyClassification, adminToken);
        expect(response.status).toBe(400);
      });

      it('should reject HPI formula with WQI parameters', async () => {
        const response = await apiHelper.post(API_PATHS.formulas, INVALID_FORMULAS.wqiParametersWithMetalType, adminToken);
        expect(response.status).toBe(400);
      });

      it('should reject duplicate formula name for same type', async () => {
        // Create first formula
        await apiHelper.post(API_PATHS.formulas, SAMPLE_HPI_FORMULA, adminToken);
        
        // Try to create duplicate
        const response = await apiHelper.post(API_PATHS.formulas, SAMPLE_HPI_FORMULA, adminToken);
        expect(response.status).toBe(409);
      });
    });

    describe('Success Cases', () => {
      it('should create HPI formula successfully', async () => {
        const response = await apiHelper.post(API_PATHS.formulas, SAMPLE_HPI_FORMULA, adminToken);
        
        expect(response.status).toBe(201);
        expect(response.body.data).toMatchObject({
          name: SAMPLE_HPI_FORMULA.name,
          type: 'hpi',
          is_active: true,
          is_default: false,
        });
        expect(response.body.data.id).toBeDefined();
        expect(response.body.data.created_at).toBeDefined();
      });

      it('should create MI formula successfully', async () => {
        const response = await apiHelper.post(API_PATHS.formulas, SAMPLE_MI_FORMULA, adminToken);
        
        expect(response.status).toBe(201);
        expect(response.body.data.type).toBe('mi');
      });

      it('should create WQI formula successfully', async () => {
        const response = await apiHelper.post(API_PATHS.formulas, SAMPLE_WQI_FORMULA, adminToken);
        
        expect(response.status).toBe(201);
        expect(response.body.data.type).toBe('wqi');
      });

      it('should allow same name for different types', async () => {
        const formula1 = { ...SAMPLE_HPI_FORMULA, name: 'Same Name Formula' };
        const formula2 = { ...SAMPLE_MI_FORMULA, name: 'Same Name Formula' };

        const response1 = await apiHelper.post(API_PATHS.formulas, formula1, adminToken);
        const response2 = await apiHelper.post(API_PATHS.formulas, formula2, adminToken);

        expect(response1.status).toBe(201);
        expect(response2.status).toBe(201);
      });
    });
  });

  // ============================================================================
  // GET /api/formulas - List Formulas
  // ============================================================================
  describe('GET /api/formulas', () => {
    beforeEach(async () => {
      // Create test formulas
      await apiHelper.post(API_PATHS.formulas, SAMPLE_HPI_FORMULA, adminToken);
      await apiHelper.post(API_PATHS.formulas, SAMPLE_MI_FORMULA, adminToken);
      await apiHelper.post(API_PATHS.formulas, SAMPLE_WQI_FORMULA, adminToken);
    });

    it('should return 401 without authentication', async () => {
      const response = await apiHelper.get(API_PATHS.formulas);
      expect(response.status).toBe(401);
    });

    it('should list all formulas for authenticated user', async () => {
      const response = await apiHelper.get(API_PATHS.formulas, researcherToken);
      
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(3);
    });

    it('should filter by type', async () => {
      const response = await apiHelper.get(`${API_PATHS.formulas}?type=hpi`, adminToken);
      
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe('hpi');
    });

    it('should search by name', async () => {
      const response = await apiHelper.get(`${API_PATHS.formulas}?search=HPI`, adminToken);
      
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should paginate results', async () => {
      const response = await apiHelper.get(`${API_PATHS.formulas}?page=1&limit=2`, adminToken);
      
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.pagination.page).toBe(1);
      expect(response.body.meta.pagination.limit).toBe(2);
      expect(response.body.meta.pagination.total).toBe(3);
    });
  });

  // ============================================================================
  // GET /api/formulas/:id - Get Single Formula
  // ============================================================================
  describe('GET /api/formulas/:id', () => {
    let createdFormulaId: number;

    beforeEach(async () => {
      const response = await apiHelper.post(API_PATHS.formulas, SAMPLE_HPI_FORMULA, adminToken);
      createdFormulaId = response.body.data.id;
    });

    it('should return 401 without authentication', async () => {
      const response = await apiHelper.get(API_PATHS.formulaById(createdFormulaId));
      expect(response.status).toBe(401);
    });

    it('should return formula by ID', async () => {
      const response = await apiHelper.get(API_PATHS.formulaById(createdFormulaId), adminToken);
      
      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(createdFormulaId);
      expect(response.body.data.name).toBe(SAMPLE_HPI_FORMULA.name);
    });

    it('should return 404 for non-existent formula', async () => {
      const response = await apiHelper.get(API_PATHS.formulaById(99999), adminToken);
      expect(response.status).toBe(404);
    });
  });

  // ============================================================================
  // GET /api/formulas/type/:type - Get Formulas by Type
  // ============================================================================
  describe('GET /api/formulas/type/:type', () => {
    beforeEach(async () => {
      await apiHelper.post(API_PATHS.formulas, SAMPLE_HPI_FORMULA, adminToken);
      await apiHelper.post(API_PATHS.formulas, { ...SAMPLE_HPI_FORMULA, name: 'Another HPI' }, adminToken);
      await apiHelper.post(API_PATHS.formulas, SAMPLE_MI_FORMULA, adminToken);
    });

    it('should return all formulas for type', async () => {
      const response = await apiHelper.get(API_PATHS.formulasByType('hpi'), adminToken);
      
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
    });

    it('should return summaries when requested', async () => {
      const response = await apiHelper.get(`${API_PATHS.formulasByType('hpi')}?summary=true`, adminToken);
      
      expect(response.status).toBe(200);
      // Summaries should only have limited fields
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).not.toHaveProperty('parameters');
    });
  });

  // ============================================================================
  // PUT /api/formulas/:id - Update Formula
  // ============================================================================
  describe('PUT /api/formulas/:id', () => {
    let createdFormulaId: number;

    beforeEach(async () => {
      const response = await apiHelper.post(API_PATHS.formulas, SAMPLE_HPI_FORMULA, adminToken);
      createdFormulaId = response.body.data.id;
    });

    it('should return 401 without authentication', async () => {
      const response = await apiHelper.put(API_PATHS.formulaById(createdFormulaId), UPDATE_PAYLOADS.nameOnly);
      expect(response.status).toBe(401);
    });

    it('should return 403 for researcher role', async () => {
      const response = await apiHelper.put(
        API_PATHS.formulaById(createdFormulaId),
        UPDATE_PAYLOADS.nameOnly,
        researcherToken
      );
      expect(response.status).toBe(403);
    });

    it('should update name successfully', async () => {
      const response = await apiHelper.put(
        API_PATHS.formulaById(createdFormulaId),
        UPDATE_PAYLOADS.nameOnly,
        adminToken
      );
      
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated Formula Name');
    });

    it('should update description successfully', async () => {
      const response = await apiHelper.put(
        API_PATHS.formulaById(createdFormulaId),
        UPDATE_PAYLOADS.descriptionOnly,
        adminToken
      );
      
      expect(response.status).toBe(200);
      expect(response.body.data.description).toBe('Updated description');
    });

    it('should update is_active successfully', async () => {
      const response = await apiHelper.put(
        API_PATHS.formulaById(createdFormulaId),
        UPDATE_PAYLOADS.isActiveOnly,
        adminToken
      );
      
      expect(response.status).toBe(200);
      expect(response.body.data.is_active).toBe(false);
    });

    it('should return 404 for non-existent formula', async () => {
      const response = await apiHelper.put(
        API_PATHS.formulaById(99999),
        UPDATE_PAYLOADS.nameOnly,
        adminToken
      );
      expect(response.status).toBe(404);
    });
  });

  // ============================================================================
  // DELETE /api/formulas/:id - Delete Formula
  // ============================================================================
  describe('DELETE /api/formulas/:id', () => {
    let createdFormulaId: number;

    beforeEach(async () => {
      const response = await apiHelper.post(API_PATHS.formulas, SAMPLE_HPI_FORMULA, adminToken);
      createdFormulaId = response.body.data.id;
    });

    it('should return 401 without authentication', async () => {
      const response = await apiHelper.delete(API_PATHS.formulaById(createdFormulaId));
      expect(response.status).toBe(401);
    });

    it('should return 403 for scientist role', async () => {
      const response = await apiHelper.delete(API_PATHS.formulaById(createdFormulaId), scientistToken);
      expect(response.status).toBe(403);
    });

    it('should delete formula successfully (admin only)', async () => {
      const response = await apiHelper.delete(API_PATHS.formulaById(createdFormulaId), adminToken);
      expect(response.status).toBe(204);

      // Verify formula is deleted (soft delete)
      const getResponse = await apiHelper.get(API_PATHS.formulaById(createdFormulaId), adminToken);
      expect(getResponse.status).toBe(404);
    });

    it('should not allow deleting default formula', async () => {
      // First set as default
      await apiHelper.post(API_PATHS.setDefault(createdFormulaId), {}, adminToken);
      
      // Try to delete
      const response = await apiHelper.delete(API_PATHS.formulaById(createdFormulaId), adminToken);
      expect(response.status).toBe(400);
    });
  });

  // ============================================================================
  // POST /api/formulas/:id/set-default - Set Default Formula
  // ============================================================================
  describe('POST /api/formulas/:id/set-default', () => {
    let formula1Id: number;
    let formula2Id: number;

    beforeEach(async () => {
      const response1 = await apiHelper.post(API_PATHS.formulas, SAMPLE_HPI_FORMULA, adminToken);
      formula1Id = response1.body.data.id;

      const response2 = await apiHelper.post(
        API_PATHS.formulas,
        { ...SAMPLE_HPI_FORMULA, name: 'Second HPI Formula' },
        adminToken
      );
      formula2Id = response2.body.data.id;
    });

    it('should return 403 for scientist role', async () => {
      const response = await apiHelper.post(API_PATHS.setDefault(formula1Id), {}, scientistToken);
      expect(response.status).toBe(403);
    });

    it('should set formula as default', async () => {
      const response = await apiHelper.post(API_PATHS.setDefault(formula1Id), {}, adminToken);
      
      expect(response.status).toBe(200);
      expect(response.body.data.is_default).toBe(true);
    });

    it('should unset previous default when setting new default', async () => {
      // Set first as default
      await apiHelper.post(API_PATHS.setDefault(formula1Id), {}, adminToken);
      
      // Set second as default
      await apiHelper.post(API_PATHS.setDefault(formula2Id), {}, adminToken);
      
      // Verify first is no longer default
      const getResponse = await apiHelper.get(API_PATHS.formulaById(formula1Id), adminToken);
      expect(getResponse.body.data.is_default).toBe(false);
    });
  });

  // ============================================================================
  // POST /api/formulas/:id/duplicate - Duplicate Formula
  // ============================================================================
  describe('POST /api/formulas/:id/duplicate', () => {
    let originalFormulaId: number;

    beforeEach(async () => {
      const response = await apiHelper.post(API_PATHS.formulas, SAMPLE_HPI_FORMULA, adminToken);
      originalFormulaId = response.body.data.id;
    });

    it('should return 403 for researcher role', async () => {
      const response = await apiHelper.post(
        API_PATHS.duplicate(originalFormulaId),
        { name: 'Duplicated Formula' },
        researcherToken
      );
      expect(response.status).toBe(403);
    });

    it('should duplicate formula successfully', async () => {
      const response = await apiHelper.post(
        API_PATHS.duplicate(originalFormulaId),
        { name: 'Duplicated Formula' },
        adminToken
      );
      
      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('Duplicated Formula');
      expect(response.body.data.id).not.toBe(originalFormulaId);
      expect(response.body.data.is_default).toBe(false);
    });

    it('should reject duplicate with existing name', async () => {
      const response = await apiHelper.post(
        API_PATHS.duplicate(originalFormulaId),
        { name: SAMPLE_HPI_FORMULA.name }, // Same name as original
        adminToken
      );
      
      expect(response.status).toBe(409);
    });

    it('should return 404 for non-existent formula', async () => {
      const response = await apiHelper.post(
        API_PATHS.duplicate(99999),
        { name: 'Duplicated Formula' },
        adminToken
      );
      
      expect(response.status).toBe(404);
    });
  });
});
