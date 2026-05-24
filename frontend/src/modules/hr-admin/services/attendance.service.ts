import { api } from '@/utils/api'; // Adjust path based on your API util

export class AttendanceService {
  /**
   * Fetch a list of records with optional filters.
   */
  static async getMany(filters?: Record<string, any>) {
    try {
      const response = await api.get('/api/v1/attendance', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching attendance list:', error);
      throw error;
    }
  }

  /**
   * Fetch a single record by ID.
   */
  static async getById(id: string) {
    try {
      const response = await api.get(`/api/v1/attendance/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching attendance ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new record.
   */
  static async create(payload: any) {
    try {
      const response = await api.post('/api/v1/attendance', payload);
      return response.data;
    } catch (error) {
      console.error('Error creating attendance:', error);
      throw error;
    }
  }

  /**
   * Update an existing record.
   */
  static async update(id: string, payload: any) {
    try {
      const response = await api.patch(`/api/v1/attendance/${id}`, payload);
      return response.data;
    } catch (error) {
      console.error(`Error updating attendance ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a record.
   */
  static async delete(id: string) {
    try {
      const response = await api.delete(`/api/v1/attendance/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting attendance ${id}:`, error);
      throw error;
    }
  }
}
