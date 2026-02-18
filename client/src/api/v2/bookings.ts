/**
 * Bookings API client (v2 modular backend).
 * Matches app/routers/bookings.py endpoints.
 */
import { apiClientV2, PaginatedResponse } from '../shared/baseClient';

export interface Booking {
  id: string;
  user_id: string;
  contact_id: string;
  contact_name?: string;
  event_url: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface BookingCreate {
  contact_id: string;
  event_url: string;
  scheduled_time: string;
  duration_minutes?: number;
  notes?: string;
}

export interface BookingUpdate {
  status?: string;
  notes?: string;
  scheduled_time?: string;
}

export const bookingsApi = {
  /**
   * Get all bookings with pagination.
   */
  async getBookings(page: number = 1, pageSize: number = 50): Promise<PaginatedResponse<Booking>> {
    const response = await apiClientV2.get<PaginatedResponse<Booking>>(
      `/bookings?page=${page}&page_size=${pageSize}`
    );
    return response.data;
  },

  /**
   * Get single booking by ID.
   */
  async getBooking(bookingId: string): Promise<Booking> {
    const response = await apiClientV2.get<Booking>(`/bookings/${bookingId}`);
    return response.data;
  },

  /**
   * Create new booking.
   */
  async createBooking(data: BookingCreate): Promise<Booking> {
    const response = await apiClientV2.post<Booking>('/bookings', data);
    return response.data;
  },

  /**
   * Update existing booking.
   */
  async updateBooking(bookingId: string, data: BookingUpdate): Promise<Booking> {
    const response = await apiClientV2.patch<Booking>(`/bookings/${bookingId}`, data);
    return response.data;
  },

  /**
   * Delete booking.
   */
  async deleteBooking(bookingId: string): Promise<void> {
    await apiClientV2.delete(`/bookings/${bookingId}`);
  },

  /**
   * Get booking statistics.
   */
  async getStats(): Promise<{ total: number; confirmed: number; pending: number; cancelled: number }> {
    const response = await apiClientV2.get('/bookings/stats');
    return response.data;
  },
};

