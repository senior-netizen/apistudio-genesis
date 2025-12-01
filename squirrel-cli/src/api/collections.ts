import { request } from './client';

export interface CollectionSummary {
  id: string;
  name: string;
  updatedAt?: string;
}

export interface CollectionPayload {
  id?: string;
  name: string;
  description?: string;
  requests: unknown[];
  updatedAt?: string;
}

export const listCollections = async (): Promise<CollectionSummary[]> => {
  return request<CollectionSummary[]>({
    url: '/api/request/collections',
    method: 'GET'
  });
};

export const getCollection = async (collectionId: string): Promise<CollectionPayload> => {
  return request<CollectionPayload>({
    url: `/api/request/collections/${collectionId}`,
    method: 'GET'
  });
};

export const pushCollection = async (payload: CollectionPayload): Promise<CollectionPayload> => {
  return request<CollectionPayload>({
    url: '/api/request/collections',
    method: payload.id ? 'PUT' : 'POST',
    data: payload
  });
};
