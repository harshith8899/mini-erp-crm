import { Request, Response } from 'express';
import * as customersService from './customers.service';
import {
  validateCreateCustomer,
  validateCreateFollowUp,
  validateListQuery,
  validateUpdateCustomer
} from './customers.validation';

function currentUserId(req: Request): string | undefined {
  return (req as any).user?.id;
}

export async function listCustomersHandler(req: Request, res: Response) {
  try {
    const { errors, data } = validateListQuery(req.query);
    if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

    const result = await customersService.listCustomers(data);
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createCustomerHandler(req: Request, res: Response) {
  try {
    const { errors, data } = validateCreateCustomer(req.body);
    if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

    const customer = await customersService.createCustomer(data, currentUserId(req));
    res.status(201).json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getCustomerHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const customer = await customersService.getCustomerById(id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    res.status(200).json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateCustomerHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const { errors, data } = validateUpdateCustomer(req.body);
    if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

    const customer = await customersService.updateCustomer(id, data);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    res.status(200).json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function addFollowUpHandler(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const { errors, data } = validateCreateFollowUp(req.body);
    if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

    const followUp = await customersService.addFollowUp(id, data, currentUserId(req));
    if (!followUp) return res.status(404).json({ error: 'Customer not found' });

    res.status(201).json(followUp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
