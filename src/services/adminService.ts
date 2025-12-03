import { supabase } from '../lib/supabase';

export type TimeRange = '7d' | '30d' | '3m' | '1y';

export interface AdminDashboardStats {
    total_revenue: number;
    total_users: number;
    active_users: number;
    revenue_chart: { date: string; value: number }[];
    user_chart: { date: string; value: number }[];
    country_stats: { name: string; value: number }[];
}

export interface AdminUser {
    id: string;
    username: string;
    display_name: string;
    email: string;
    role: 'FAN' | 'CREATOR' | 'ADMIN';
    country: string | null;
    created_at: string;
    updated_at: string; // <-- NEU
    total_earnings: number;
    total_spent: number;
}

export interface UserFilterOptions {
    search?: string;
    role?: string;
    country?: string;
    sortBy?: 'created_at' | 'earnings' | 'spent';
    sortDesc?: boolean;
}

export class AdminService {
    async getStats(range: TimeRange = '30d'): Promise<AdminDashboardStats> {
        // @ts-ignore
        const { data, error } = await supabase.rpc('get_admin_dashboard_stats', { time_range: range });
        if (error) throw error;
        return data as AdminDashboardStats;
    }

    async getUsers(options: UserFilterOptions = {}): Promise<AdminUser[]> {
        // @ts-ignore
        const { data, error } = await supabase.rpc('get_admin_users', {
            search_query: options.search || '',
            filter_role: options.role || 'ALL',
            filter_country: options.country || 'ALL',
            sort_by: options.sortBy || 'created_at',
            sort_desc: options.sortDesc !== false // Default true
        });

        if (error) throw error;
        return data as AdminUser[];
    }

    async deletePost(postId: string) {
        const { error } = await supabase.from('posts').delete().eq('id', postId);
        if (error) throw error;
    }

    async dismissReport(reportId: string) {
        const { error } = await supabase
            .from('content_reports')
            // @ts-ignore
            .update({ status: 'DISMISSED' })
            .eq('id', reportId);
        if (error) throw error;
    }
}

export const adminService = new AdminService();