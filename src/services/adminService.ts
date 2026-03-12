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
    birthdate: string | null;
    is_banned: boolean;
    created_at: string;
    updated_at: string;
    last_seen: string | null;
    total_earnings: number;
    total_spent: number;
    identity_verification_status?: 'none' | 'pending' | 'verified' | 'rejected';
    external_verification_id?: string | null;
    real_name?: string | null;
    address_street?: string | null;
    address_city?: string | null;
    address_zip?: string | null;
    address_country?: string | null;
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
            sort_desc: options.sortDesc !== false
        });

        if (error) throw error;
        return data as AdminUser[];
    }

    async takeDownPost(postId: string, reportId: string, reason: string) {
        // 1. Post auf TAKEDOWN setzen
        const { error: postError } = await supabase
            .from('posts')
            .update({
                // @ts-ignore
                moderation_status: 'TAKEDOWN',
                takedown_reason: reason
            })
            .eq('id', postId);
        if (postError) throw postError;

        // 2. Report auf RESOLVED_TAKEDOWN setzen
        const { error: reportError } = await supabase
            .from('content_reports')
            .update({
                // @ts-ignore
                status: 'RESOLVED_TAKEDOWN',
                resolution_reason: reason
            })
            .eq('id', reportId);
        if (reportError) throw reportError;
    }

    async dismissReport(reportId: string, reason: string) {
        const { error } = await supabase
            .from('content_reports')
            .update({
                // @ts-ignore
                status: 'RESOLVED_DISMISSED',
                resolution_reason: reason
            })
            .eq('id', reportId);
        if (error) throw error;
    }

    // NEU: Ban Toggle
    async toggleUserBan(userId: string, banStatus: boolean) {
        const { error } = await supabase.rpc('toggle_user_ban', {
            user_id_input: userId,
            ban_status: banStatus
        });
        if (error) throw error;
    }
}

export const adminService = new AdminService();