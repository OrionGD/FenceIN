import { api } from '@/utils/api'; // Adjust path based on your API util

export class AuditService {
  /**
   * Fetch a list of records with optional filters.
   */
  static async getMany(filters?: Record<string, any>) {
    try {
      const response = await api.get('/api/v1/audit', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching audit list:', error);
      throw error;
    }
  }

  /**
   * Fetch a single record by ID.
   */
  static async getById(id: string) {
    try {
      const response = await api.get(`/api/v1/audit/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching audit ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new record.
   */
  static async create(payload: any) {
    try {
      const response = await api.post('/api/v1/audit', payload);
      return response.data;
    } catch (error) {
      console.error('Error creating audit:', error);
      throw error;
    }
  }

  /**
   * Update an existing record.
   */
  static async update(id: string, payload: any) {
    try {
      const response = await api.patch(`/api/v1/audit/${id}`, payload);
      return response.data;
    } catch (error) {
      console.error(`Error updating audit ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a record.
   */
  static async delete(id: string) {
    try {
      const response = await api.delete(`/api/v1/audit/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting audit ${id}:`, error);
      throw error;
    }
  }
}
