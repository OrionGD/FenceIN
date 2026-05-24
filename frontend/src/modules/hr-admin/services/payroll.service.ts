import { api } from '@/utils/api'; // Adjust path based on your API util

export class PayrollService {
  /**
   * Fetch a list of records with optional filters.
   */
  static async getMany(filters?: Record<string, any>) {
    try {
      const response = await api.get('/api/v1/payroll', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching payroll list:', error);
      throw error;
    }
  }

  /**
   * Fetch a single record by ID.
   */
  static async getById(id: string) {
    try {
      const response = await api.get(`/api/v1/payroll/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching payroll ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new record.
   */
  static async create(payload: any) {
    try {
      const response = await api.post('/api/v1/payroll', payload);
      return response.data;
    } catch (error) {
      console.error('Error creating payroll:', error);
      throw error;
    }
  }

  /**
   * Update an existing record.
   */
  static async update(id: string, payload: any) {
    try {
      const response = await api.patch(`/api/v1/payroll/${id}`, payload);
      return response.data;
    } catch (error) {
      console.error(`Error updating payroll ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a record.
   */
  static async delete(id: string) {
    try {
      const response = await api.delete(`/api/v1/payroll/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting payroll ${id}:`, error);
      throw error;
    }
  }
}
