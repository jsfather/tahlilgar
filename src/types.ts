export interface FormField {
  id: string;
  label: string;
  type: "text" | "number" | "email" | "select" | "textarea" | "tel";
  required: boolean;
  options?: string[];
}

export interface FormDefinition {
  id: number;
  name: string;
  fields: FormField[];
}

export interface Submission {
  id: number;
  form_id: number;
  form_name: string;
  data: Record<string, any>;
  email: string;
  created_at: string;
  is_duplicate?: boolean;
}

export interface ContentBlock {
  id: string;
  title: string;
  body: string;
}

export interface SocialLink {
  platform: string;
  url: string;
  icon: string;
}

export interface SiteSettings {
  site_name: string;
  site_description: string;
  logo_url: string;
  primary_color: string;
  contact_phone: string;
  video_url: string;
  success_video_url: string;
  social_links: SocialLink[];
  quotes: string[];
}
