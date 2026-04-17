import { randomUUID } from 'node:crypto';
import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  BatchGetCommand,
} from '@aws-sdk/lib-dynamodb';

import { ddb } from './aws/clients';
import { awsEnv } from './aws/env';
import type { Car, Lead, Settings } from './types';

const SETTINGS_ID = 'default';

function now(): string {
  return new Date().toISOString();
}

function withTimestamps<T extends object>(value: T, isNew: boolean): T & { created_at: string; updated_at: string } {
  const ts = now();
  return {
    ...value,
    ...(isNew ? { created_at: ts } : {}),
    updated_at: ts,
  } as T & { created_at: string; updated_at: string };
}

// ===== Cars =====

export async function listPublishedCars(): Promise<Car[]> {
  const result = await ddb().send(
    new ScanCommand({
      TableName: awsEnv.carsTable(),
      FilterExpression: '#status = :s',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':s': 'published' },
    }),
  );
  return (result.Items ?? []) as Car[];
}

export async function listAllCars(): Promise<Car[]> {
  const result = await ddb().send(new ScanCommand({ TableName: awsEnv.carsTable() }));
  return (result.Items ?? []) as Car[];
}

export async function getCarById(id: string): Promise<Car | null> {
  const result = await ddb().send(new GetCommand({ TableName: awsEnv.carsTable(), Key: { id } }));
  return (result.Item as Car) ?? null;
}

export async function getCarBySlug(slug: string): Promise<Car | null> {
  const result = await ddb().send(
    new ScanCommand({
      TableName: awsEnv.carsTable(),
      FilterExpression: 'slug = :slug',
      ExpressionAttributeValues: { ':slug': slug },
      Limit: 1,
    }),
  );
  return ((result.Items ?? [])[0] as Car) ?? null;
}

export type CarInput = Omit<Car, 'id' | 'created_at' | 'updated_at'> & { id?: string };

export async function upsertCar(input: CarInput): Promise<Car> {
  const id = input.id ?? randomUUID();
  const existing = input.id ? await getCarById(input.id) : null;
  const item = withTimestamps(
    {
      ...input,
      id,
      created_at: existing?.created_at ?? now(),
    },
    !existing,
  ) as Car;
  await ddb().send(new PutCommand({ TableName: awsEnv.carsTable(), Item: item }));
  return item;
}

export async function deleteCar(id: string): Promise<void> {
  await ddb().send(new DeleteCommand({ TableName: awsEnv.carsTable(), Key: { id } }));
}

export async function batchGetCarsByIds(ids: string[]): Promise<Map<string, Car>> {
  const map = new Map<string, Car>();
  if (ids.length === 0) return map;
  const unique = Array.from(new Set(ids));
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 100) chunks.push(unique.slice(i, i + 100));
  for (const chunk of chunks) {
    const result = await ddb().send(
      new BatchGetCommand({
        RequestItems: { [awsEnv.carsTable()]: { Keys: chunk.map((id) => ({ id })) } },
      }),
    );
    const items = (result.Responses?.[awsEnv.carsTable()] ?? []) as Car[];
    for (const item of items) map.set(item.id, item);
  }
  return map;
}

// ===== Leads =====

export async function listLeads(): Promise<Lead[]> {
  const result = await ddb().send(new ScanCommand({ TableName: awsEnv.leadsTable() }));
  const items = (result.Items ?? []) as Lead[];
  return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const result = await ddb().send(new GetCommand({ TableName: awsEnv.leadsTable(), Key: { id } }));
  return (result.Item as Lead) ?? null;
}

export type LeadInput = Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'status'> & {
  status?: Lead['status'];
};

export async function createLead(input: LeadInput): Promise<Lead> {
  const item: Lead = {
    ...input,
    id: randomUUID(),
    status: input.status ?? 'new',
    created_at: now(),
    updated_at: now(),
  };
  await ddb().send(new PutCommand({ TableName: awsEnv.leadsTable(), Item: item }));
  return item;
}

export async function updateLeadStatus(id: string, status: Lead['status']): Promise<void> {
  await ddb().send(
    new UpdateCommand({
      TableName: awsEnv.leadsTable(),
      Key: { id },
      UpdateExpression: 'SET #status = :s, updated_at = :u',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':s': status, ':u': now() },
    }),
  );
}

// ===== Settings =====

export async function getSettings(): Promise<Settings | null> {
  const result = await ddb().send(
    new GetCommand({ TableName: awsEnv.settingsTable(), Key: { id: SETTINGS_ID } }),
  );
  return (result.Item as Settings) ?? null;
}

export async function upsertSettings(patch: Partial<Settings>): Promise<Settings> {
  const existing = await getSettings();
  const merged: Settings = {
    id: SETTINGS_ID,
    dealership_name: patch.dealership_name ?? existing?.dealership_name ?? 'J&F Auto',
    logo_url: patch.logo_url ?? existing?.logo_url ?? null,
    primary_color: patch.primary_color ?? existing?.primary_color ?? '#000000',
    secondary_color: patch.secondary_color ?? existing?.secondary_color ?? '#666666',
    tagline: patch.tagline ?? existing?.tagline ?? null,
    phone: patch.phone ?? existing?.phone ?? null,
    email: patch.email ?? existing?.email ?? null,
    address: patch.address ?? existing?.address ?? null,
    about_text: patch.about_text ?? existing?.about_text ?? null,
    hours_json: patch.hours_json ?? existing?.hours_json ?? null,
    created_at: existing?.created_at ?? now(),
    updated_at: now(),
  };
  await ddb().send(new PutCommand({ TableName: awsEnv.settingsTable(), Item: merged }));
  return merged;
}
