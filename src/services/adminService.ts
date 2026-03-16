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
    is_suspended: boolean;
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

        // 2. Report auf resolved setzen (user_reports nutzt 'resolved')
        const { error: reportError } = await supabase
            .from('user_reports')
            .update({
                // @ts-ignore
                status: 'resolved',
                resolution_reason: reason
            })
            .eq('id', reportId);
        if (reportError) throw reportError;

        // 3. Audit Log
        await this.writeAuditLog('takedown_post', postId, { reason, reportId });

        // 4. E-Mail an den Creator
        try {
            const { data: postData } = await supabase.from('posts').select('creator_id').eq('id', postId).single();
            if (postData?.creator_id) {
                await supabase.functions.invoke('send-moderation-email', {
                    body: {
                        type: 'content_moderated',
                        userId: postData.creator_id,
                        data: { reason }
                    }
                });
            }
        } catch (e) {
            console.warn('Could not send content moderated email:', e);
        }
    }

    async dismissReport(reportId: string, reason: string) {
        const { error } = await supabase
            .from('user_reports')
            .update({
                // @ts-ignore
                status: 'dismissed',
                resolution_reason: reason
            })
            .eq('id', reportId);
        if (error) throw error;

        // Audit Log
        await this.writeAuditLog('dismiss_report', reportId, { reason });
    }

    async handleAppeal(reportId: string, decision: 'accepted' | 'rejected', adminNotes: string) {
        // 1. Report abrufen, um zu wissen was gemeldet wurde
        const { data: report, error: getError } = await supabase
            .from('user_reports')
            .select('*')
            .eq('id', reportId)
            .single();
        if (getError) throw getError;

        // 2. Status aktualisieren
        const { error: reportError } = await supabase
            .from('user_reports')
            .update({
                // @ts-ignore
                appeal_status: decision,
                resolution_reason: adminNotes
            })
            .eq('id', reportId);
        if (reportError) throw reportError;

        // 3. Wenn akzeptiert: Sperren aufheben
        if (decision === 'accepted') {
            if (report.related_post_id) {
                await supabase
                    .from('posts')
                    .update({
                        // @ts-ignore
                        moderation_status: 'ACTIVE'
                    })
                    .eq('id', report.related_post_id);
            } else if (report.reported_id) {
                // Wenn keine Inhalts-ID vorhanden, war es eine Account-Sperrung
                if (!report.related_message_id && !report.related_comment_id) {
                    await supabase
                        .from('users')
                        .update({
                            // @ts-ignore
                            is_suspended: false,
                            has_pending_appeal: false
                        })
                        .eq('id', report.reported_id);
                }
            }
        } else {
            // Wenn abgelehnt: pending flag entfernen (bei Account-Sperre)
            if (report.reported_id && !report.related_post_id && !report.related_message_id && !report.related_comment_id) {
                await supabase
                    .from('users')
                    .update({
                        // @ts-ignore
                        has_pending_appeal: false
                    })
                    .eq('id', report.reported_id);
            }
        }

        // 4. Audit Log
        await this.writeAuditLog('handle_appeal', reportId, { decision, adminNotes });

        // 5. E-Mail senden
        try {
            await supabase.functions.invoke('send-moderation-email', {
                body: {
                    type: 'appeal_decision',
                    userId: report.reported_id,
                    data: { appealStatus: decision, adminNotes }
                }
            });
        } catch (e) {
            console.warn('Could not send appeal decision email:', e);
        }
    }

    async suspendUser(userId: string, reportId: string, reason: string) {
        // 1. User auf is_suspended setzen
        const { error: userError } = await supabase
            .from('users')
            .update({
                // @ts-ignore
                is_suspended: true
            })
            .eq('id', userId);
        if (userError) throw userError;

        // 2. Report auf resolved setzen
        const { error: reportError } = await supabase
            .from('user_reports')
            .update({
                // @ts-ignore
                status: 'resolved',
                resolution_reason: reason
            })
            .eq('id', reportId);
        if (reportError) throw reportError;

        // 3. Audit Log
        await this.writeAuditLog('suspend_user', userId, { reason, reportId });

        // 4. E-Mail an den Nutzer
        try {
            await supabase.functions.invoke('send-moderation-email', {
                body: {
                    type: 'account_suspended',
                    userId: userId,
                    data: { reason }
                }
            });
        } catch (e) {
            console.warn('Could not send account suspended email:', e);
        }
    }

    // Hilfsmethode für Audit-Logs
    private async writeAuditLog(action: string, entityId: string, details: any) {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (userData.user) {
                await supabase.from('admin_audit_logs').insert({
                    admin_user_id: userData.user.id,
                    action,
                    entity_id: entityId,
                    details
                });
            }
        } catch (e) {
            console.warn('Could not write audit log:', e);
            // Wir werfen hier keinen Fehler, damit die Hauptaktion nicht fehlschlägt
        }
    }

    // NEU: Ban Toggle
    async toggleUserBan(userId: string, banStatus: boolean) {
    const { error } = await supabase.rpc('toggle_user_ban', {
      user_id_input: userId,
      ban_status: banStatus
    });
    if (error) throw error;
  }

  async toggleUserSuspension(userId: string, suspensionStatus: boolean, reason?: string) {
    if (suspensionStatus) {
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      
      // Wenn wir sperren, suchen wir nach einem bestehenden Report oder erstellen einen Fallback-Report für den Grund
      const { data: existingReport } = await supabase
        .from('user_reports')
        .select('id')
        .eq('reported_id', userId)
        .is('related_post_id', null)
        .is('related_message_id', null)
        .is('related_comment_id', null)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingReport) {
        const { error: updateError } = await supabase
          .from('user_reports')
          .update({
            status: 'resolved',
            resolution_reason: reason || 'Konto durch Administrator gesperrt'
          })
          .eq('id', existingReport.id);
        
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('user_reports')
          .insert({
            reporter_id: adminUser?.id,
            reported_id: userId,
            reason: 'admin_manual',
            description: 'Manuelle Sperrung durch Admin im Benutzer-Management',
            status: 'resolved',
            resolution_reason: reason || 'Konto durch Administrator gesperrt'
          });
        
        if (insertError) throw insertError;
      }
    }

    const { error } = await supabase
        .from('users')
        .update({
            // @ts-ignore
            is_suspended: suspensionStatus,
            has_pending_appeal: false
        })
        .eq('id', userId);
    
    if (error) throw error;

    // Audit Log
    await this.writeAuditLog('toggle_user_suspension', userId, { suspensionStatus, reason });

    // E-Mail senden wenn gesperrt
    if (suspensionStatus) {
      try {
          await supabase.functions.invoke('send-moderation-email', {
              body: {
                  type: 'account_suspended',
                  userId: userId,
                  data: { reason: reason || 'Verstoß gegen Richtlinien' }
              }
          });
      } catch (e) {
          console.warn('Could not send account suspended email:', e);
      }
    }
  }

  async getReportedMessageContext(messageId: string, conversationId: string) {
    // 1. Gemeldete Nachricht finden
    const { data: targetMessage, error: msgError } = await supabase
      .from('decrypted_messages')
      .select(`
        *,
        sender:users!sender_id(id, display_name, avatar_url),
        receiver:users!receiver_id(id, display_name, avatar_url)
      `)
      .eq('id', messageId)
      .single();

    if (msgError || !targetMessage) throw new Error('Nachricht nicht gefunden');

    // 2. Genau 5 Nachrichten DAVOR holen
    const { data: messagesBefore } = await supabase
      .from('decrypted_messages')
      .select(`
        *,
        sender:users!sender_id(id, display_name, avatar_url),
        receiver:users!receiver_id(id, display_name, avatar_url)
      `)
      // Wir simulieren hier die Conversation-ID Logik da die Spalte fehlt
      .or(`and(sender_id.eq.${targetMessage.sender_id},receiver_id.eq.${targetMessage.receiver_id}),and(sender_id.eq.${targetMessage.receiver_id},receiver_id.eq.${targetMessage.sender_id})`)
      .lt('created_at', targetMessage.created_at)
      .order('created_at', { ascending: false })
      .limit(5);

    // 3. Genau 5 Nachrichten DANACH holen
    const { data: messagesAfter } = await supabase
      .from('decrypted_messages')
      .select(`
        *,
        sender:users!sender_id(id, display_name, avatar_url),
        receiver:users!receiver_id(id, display_name, avatar_url)
      `)
      .or(`and(sender_id.eq.${targetMessage.sender_id},receiver_id.eq.${targetMessage.receiver_id}),and(sender_id.eq.${targetMessage.receiver_id},receiver_id.eq.${targetMessage.sender_id})`)
      .gt('created_at', targetMessage.created_at)
      .order('created_at', { ascending: true })
      .limit(5);

    // 4. Array in chronologischer Reihenfolge zusammenbauen
    const allMessages = [
      ...(messagesBefore?.reverse() || []),
      targetMessage,
      ...(messagesAfter || [])
    ];

    // 5. DSGVO-Audit-Log schreiben (WICHTIG!)
    await this.writeAuditLog('read_chat_context', messageId, { reason: 'Prüfung einer Meldung gem. DSA/DSGVO' });

    return allMessages;
  }

  async getReportedCommentContext(commentId: string) {
    const { data: comment, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:users!user_id(id, display_name, avatar_url),
        post:posts!post_id(*)
      `)
      .eq('id', commentId)
      .single();
    
    if (error) throw error;
    return comment;
  }

  async getReportedProfileContext(userId: string) {
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return profile;
  }
}

export const adminService = new AdminService();