import { Request, Response } from 'express';
import * as challansService from './challans.service';
import { ChallanServiceError } from './challans.service';
import {
  validateCreateChallan,
  validateListChallansQuery,
  validateUpdateChallan
} from './challans.validation';

function currentUserId(req: Request): string | undefined {
  return (req as any).user?.id;
}

// Used by create/update: these errors originate from validating client-submitted input
// (a customerId/productId that doesn't exist or isn't usable) — bad input, not a state conflict.
function statusForInputError(code: string): number {
  if (code === 'CUSTOMER_NOT_FOUND' || code === 'PRODUCT_NOT_FOUND' || code === 'PRODUCT_INACTIVE') return 400;
  if (code === 'CHALLAN_NOT_FOUND') return 404;
  return 409; // NOT_DRAFT, INSUFFICIENT_STOCK (only reachable via create-as-CONFIRMED), etc.
}

// Used by confirm/cancel: these errors mean "this challan's current state doesn't allow the
// requested transition" — a state conflict — except CHALLAN_NOT_FOUND which is a real 404.
function statusForTransitionError(code: string): number {
  if (code === 'CHALLAN_NOT_FOUND') return 404;
  return 409; // NOT_DRAFT, ALREADY_CANCELLED, NOT_CANCELLABLE, INSUFFICIENT_STOCK, PRODUCT_NOT_FOUND, PRODUCT_INACTIVE
}

export async function listChallansHandler(req: Request, res: Response) {
  try {
    const { errors, data } = validateListChallansQuery(req.query);
    if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

    const result = await challansService.listChallans(data);
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createChallanHandler(req: Request, res: Response) {
  try {
    const { errors, data } = validateCreateChallan(req.body);
    if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

    const result = await challansService.createChallan(data, currentUserId(req));
    if ('error' in result && result.error instanceof ChallanServiceError) {
      return res.status(statusForInputError(result.error.code)).json({ error: result.error.message });
    }

    res.status(201).json((result as any).challan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getChallanHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const challan = await challansService.getChallanById(id);
    if (!challan) return res.status(404).json({ error: 'Challan not found' });

    res.status(200).json(challan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateChallanHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const { errors, data } = validateUpdateChallan(req.body);
    if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

    const result = await challansService.updateChallan(id, data);
    if ('error' in result && result.error instanceof ChallanServiceError) {
      return res.status(statusForInputError(result.error.code)).json({ error: result.error.message });
    }

    res.status(200).json((result as any).challan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function confirmChallanHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const result = await challansService.confirmChallan(id, currentUserId(req));
    if ('error' in result && result.error instanceof ChallanServiceError) {
      return res.status(statusForTransitionError(result.error.code)).json({ error: result.error.message });
    }

    res.status(200).json((result as any).challan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function cancelChallanHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const result = await challansService.cancelChallan(id, currentUserId(req));
    if ('error' in result && result.error instanceof ChallanServiceError) {
      return res.status(statusForTransitionError(result.error.code)).json({ error: result.error.message });
    }

    res.status(200).json((result as any).challan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
