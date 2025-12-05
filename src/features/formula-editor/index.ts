/**
 * Formula Editor Routes
 * CRUD operations for managing calculation formulas (HPI, MI, WQI standards)
 *
 * Access:
 * - Read: All authenticated users
 * - Create/Update: admin, scientist
 * - Delete/Set Default: admin only
 */

import { Router } from 'express';
import Route from '../../interfaces/route.interface';

// Import API routes
import createFormulaRouter from './apis/create-formula';
import listFormulasRouter from './apis/list-formulas';
import getFormulaRouter from './apis/get-formula';
import getFormulasByTypeRouter from './apis/get-formulas-by-type';
import updateFormulaRouter from './apis/update-formula';
import deleteFormulaRouter from './apis/delete-formula';
import setDefaultFormulaRouter from './apis/set-default-formula';
import duplicateFormulaRouter from './apis/duplicate-formula';

class FormulaEditorRoute implements Route {
  public path = '/formulas';
  public router = Router();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // GET /api/formulas/type/:type - Get formulas by type (must be before /:id route)
    this.router.use(this.path, getFormulasByTypeRouter);

    // POST /api/formulas - Create new formula
    this.router.use(this.path, createFormulaRouter);

    // GET /api/formulas - List all formulas with filters
    this.router.use(this.path, listFormulasRouter);

    // GET /api/formulas/:id - Get single formula
    this.router.use(this.path, getFormulaRouter);

    // PUT /api/formulas/:id - Update formula
    this.router.use(this.path, updateFormulaRouter);

    // DELETE /api/formulas/:id - Soft delete formula
    this.router.use(this.path, deleteFormulaRouter);

    // POST /api/formulas/:id/set-default - Set as default
    this.router.use(this.path, setDefaultFormulaRouter);

    // POST /api/formulas/:id/duplicate - Duplicate formula
    this.router.use(this.path, duplicateFormulaRouter);
  }
}

export default FormulaEditorRoute;
