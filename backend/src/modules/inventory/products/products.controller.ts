import { Request, Response } from 'express';
import * as productsService from './products.service';
import { SKU_CONFLICT, WAREHOUSE_NOT_FOUND } from './products.service';
import {
  validateCreateProduct,
  validateCreateStockMovement,
  validateListProductsQuery,
  validateUpdateProduct
} from './products.validation';

function currentUserId(req: Request): string | undefined {
  return (req as any).user?.id;
}

export async function listProductsHandler(req: Request, res: Response) {
  try {
    const { errors, data } = validateListProductsQuery(req.query);
    if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

    const result = await productsService.listProducts(data);
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createProductHandler(req: Request, res: Response) {
  try {
    const { errors, data } = validateCreateProduct(req.body);
    if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

    const result = await productsService.createProduct(data, currentUserId(req));
    if ('error' in result) {
      if (result.error === WAREHOUSE_NOT_FOUND) {
        return res.status(400).json({ error: 'warehouseId does not reference an existing warehouse' });
      }
      if (result.error === SKU_CONFLICT) {
        return res.status(409).json({ error: 'A product with this SKU already exists' });
      }
    }

    res.status(201).json((result as any).product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getProductHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const product = await productsService.getProductById(id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    res.status(200).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateProductHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const { errors, data } = validateUpdateProduct(req.body);
    if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

    const result = await productsService.updateProduct(id, data);
    if ('error' in result) {
      if (result.error === 'NOT_FOUND') return res.status(404).json({ error: 'Product not found' });
      if (result.error === WAREHOUSE_NOT_FOUND) {
        return res.status(400).json({ error: 'warehouseId does not reference an existing warehouse' });
      }
      if (result.error === SKU_CONFLICT) {
        return res.status(409).json({ error: 'A product with this SKU already exists' });
      }
    }

    res.status(200).json((result as any).product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function addStockMovementHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const { errors, data } = validateCreateStockMovement(req.body);
    if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

    const result = await productsService.addStockMovement(id, data, currentUserId(req));

    if (!result.ok) {
      if (result.reason === 'PRODUCT_NOT_FOUND') return res.status(404).json({ error: 'Product not found' });
      if (result.reason === 'PRODUCT_INACTIVE') {
        return res.status(409).json({ error: 'Cannot record a stock movement for an inactive product' });
      }
      if (result.reason === 'INSUFFICIENT_STOCK') {
        return res.status(409).json({ error: 'Insufficient stock for this OUT movement' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }

    res.status(201).json({ movement: result.movement, product: result.product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listStockMovementsHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const movements = await productsService.listStockMovements(id);
    if (movements === null) return res.status(404).json({ error: 'Product not found' });

    res.status(200).json({ data: movements });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
