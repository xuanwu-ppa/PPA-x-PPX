export interface Invitation {
  id: number;
  curator: string;
  course_id: string;
  course_name: string;
  campaign_name: string;
  campaign_start?: string;
  campaign_end?: string;
  pm?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}
