export type ServiceCategory = string;
export type BuiltInServiceCategory =
  | 'websites'
  | 'ecommerce'
  | 'mobile'
  | 'web-apps'
  | 'systems'
  | 'integrations';

export interface Service {
  id: ServiceCategory;
  number: string;
  title: string;
  englishTitle: string;
  summary: string;
  businessValue: string;
  includes: string[];
  deliverables: string[];
  suitableFor: string;
  icon: 'website' | 'store' | 'mobile' | 'webapp' | 'system' | 'integration';
}

export type ProjectCategory = 'web' | 'commerce' | 'mobile' | 'systems';

export interface Project {
  cms?: import('../../shared/schema').ProjectContent;
  slug: string;
  name: string;
  category: ProjectCategory;
  categoryLabel: string;
  tagline: string;
  overview: string;
  challenge: string;
  solution: string;
  designApproach: string;
  features: string[];
  developmentHighlights: string[];
  visualLabel: string;
  accent: 'teal' | 'ivory' | 'petrol';
}

export interface ProjectInquiry {
  fullName: string;
  businessName?: string;
  email: string;
  serviceType: string;
  projectDescription: string;
  budget?: string;
  timeline?: string;
  additionalDetails?: string;
}
