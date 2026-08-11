import { Request, Response } from 'express';
import * as warehousesService from './warehouses.service';
import { NAME_CONFLICT } from './warehouses.service';
import {
  validateCreateWarehouse,
  validateListWarehousesQuery,
  validateUpdateWarehouse
} from './warehouses.validation';

export async function listWarehousesHandler(req: Request, res: Response) {
  try {
    const { errors, data } = validateListWarehousesQuery(req.query);
    if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

    const result = await warehousesService.listWarehouses(data);
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createWarehouseHandler(req: Request, res: Response) {
  try {
    const { errors, data } = validateCreateWarehouse(req.body);
    if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

    const result = await warehousesService.createWarehouse(data);
    if ('error' in result && result.error === NAME_CONFLICT) {
      return res.status(409).json({ error: 'A warehouse with this name already exists' });
    }

    res.status(201).json((result as any).warehouse);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getWarehouseHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const warehouse = await warehousesService.getWarehouseById(id);
    if (!warehouse) return res.status(404).json({ error: 'Warehouse not found' });

    res.status(200).json(warehouse);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateWarehouseHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const { errors, data } = validateUpdateWarehouse(req.body);
    if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

    const result = await warehousesService.updateWarehouse(id, data);
    if ('error' in result) {
      if (result.error === 'NOT_FOUND') return res.status(404).json({ error: 'Warehouse not found' });
      if (result.error === NAME_CONFLICT) {
        return res.status(409).json({ error: 'A warehouse with this name already exists' });
      }
    }

    res.status(200).json((result as any).warehouse);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
