import { supabase } from '../lib/supabase';

export interface AdminDashboardStats {
    total_revenue: number;
    total_users: number;
    active_users: number;
    revenue_chart: { date: string; value: number }[];
    user_chart: { date: string; value: number }[];
}

export interface AdminUser {
    id: string;
    username: string;
    display_name: string;
    role: 'FAN' | 'CREATOR' | 'ADMIN';
    created_at: string;
    total_earnings: number;
}

export class AdminService {
    async getStats(): Promise<AdminDashboardStats> {
        const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
        if (error) throw error;
        return data as AdminDashboardStats;
    }

    async getUsers(search: string = ''): Promise<AdminUser[]> {
        // @ts-ignore - Typen sind evtl. noch nicht synchronisiert
        const { data, error } = await supabase.rpc('get_admin_users', { search_query: search });
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
            // @ts-ignore - Status Update Typ-Check ignorieren
            .update({ status: 'DISMISSED' })
            .eq('id', reportId);
        if (error) throw error;
    }
}

export const adminService = new AdminService();