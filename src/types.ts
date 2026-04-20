
export interface Settings {
  site_title: string;
  site_description: string;
  primary_color: string;
  secondary_color: string;
  sms_api_key: string;
  sms_sender: string;
  sms_pattern_code: string;
  video_type: 'direct' | 'aparat';
  video_link: string;
  video_cover: string;
  show_video: string;
  countdown_end: string;
  missed_opportunities_count: string;
  bottom_banner: string;
  header_logo: string;
  footer_text: string;
  instagram_link: string;
  phone_link: string;
  main_title: string;
  lottery_info: string;
  participation_text: string;
  download_box_title: string;
  show_testimonials: string;
  show_bottom_banner: string;
  bottom_banner_image: string;
  bottom_banner_link: string;
  testimonials_title: string;
  custom_popup_link: string;
  custom_popup_label: string;
  lead_assignment_mode?: 'manual' | 'round_robin';
  last_expert_idx?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  favicon_url?: string;
  timer_type?: string;
  timer_title?: string;
  form_avatar?: string;
  form_title?: string;
  form_description?: string;
  form_name_label?: string;
  form_phone_label?: string;
  stats_title?: string;
  stats_description?: string;
}

export interface Testimonial {
  id: number;
  title: string;
  video_type: 'direct' | 'aparat';
  video_link: string;
  video_cover: string;
  order_index: number;
}

export interface Lead {
  id: number;
  name: string;
  surname: string;
  phone: string;
  form_id: string;
  status: string;
  expert: string;
  stage: 'new' | 'contacted' | 'interested' | 'negotiation' | 'customer' | 'lost';
  notes: string;
  city?: string;
  province?: string;
  degree?: string;
  background?: string;
  source_type?: string;
  visit_count: number;
  created_at: string;
  requested_product_id?: number;
  custom_data?: string; // JSON string
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  installments_enabled: boolean;
  created_at: string;
}

export interface Deposit {
  id: number;
  lead_id: number;
  product_id: number;
  amount: number;
  total_amount?: number;
  payment_type: 'cash' | 'installments';
  installment_count?: number;
  receipt_urls: string;
  status: 'pending' | 'approved' | 'rejected' | 'reupload';
  rejection_reason?: string;
  payment_date: string;
  next_installment_date?: string;
  expert_id: number;
  created_at: string;
  // Joined
  product_name?: string;
  expert_name?: string;
}

export interface DepositInstallment {
  id: number;
  deposit_id: number;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid';
  created_at: string;
}

export interface CustomField {
  id: number;
  name: string;
  label: string;
  type: 'text' | 'number' | 'select';
  target: 'registration' | 'profile';
  is_required: boolean;
  options: string; // comma separated
  created_at: string;
}

export interface LeadActivity {
  id: number;
  lead_id: number;
  expert_id: number;
  expert_name?: string;
  type: 'call' | 'note' | 'status_change' | 'sms_sent';
  content: string;
  created_at: string;
}

export interface FollowUp {
  id: number;
  lead_id: number;
  expert_id: number;
  scheduled_at: string;
  notes: string;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  // Joined fields
  name?: string;
  surname?: string;
  phone?: string;
}

export interface SMSTemplate {
  id: number;
  name: string;
  content: string;
  pattern_code?: string;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  role: string;
  permissions: string; // JSON string
}

export interface Download {
  id: number;
  title: string;
  size: string;
  link: string;
}

export interface Stat {
  id: number;
  date: string;
  visits: number;
}

export type TicketStatus = 'new' | 'pending' | 'answered' | 'on_hold' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high';

export interface Ticket {
  id: number;
  user_id: number;
  lead_id: number | null;
  subject: string;
  department: string;
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  // Joined fields
  username?: string;
  lead_name?: string;
  lead_surname?: string;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  user_id: number;
  content: string;
  file_url: string | null;
  created_at: string;
  // Joined fields
  username?: string;
  role?: string;
}
