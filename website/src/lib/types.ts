export type ToolCategory = 'security' | 'developer' | 'system' | 'productivity';

export interface ToolItem {
  id: string;
  name: string;
  category: ToolCategory;
  titleTr: string;
  titleEn: string;
  descriptionTr: string;
  descriptionEn: string;
  badgeTr: string;
  badgeEn: string;
  icon: string;
  hasInBrowserDemo: boolean;
  highlightTag?: string;
  techSpecs: string[];
}

export type Language = 'tr' | 'en';
export type Currency = 'TRY' | 'USD' | 'EUR';

export interface PricingPlan {
  id: 'free' | 'personal' | 'studio';
  nameTr: string;
  nameEn: string;
  badgeTr: string;
  badgeEn: string;
  descriptionTr: string;
  descriptionEn: string;
  prices: {
    TRY: { current: number; original: number; symbol: string };
    USD: { current: number; original: number; symbol: string };
    EUR: { current: number; original: number; symbol: string };
  };
  featuresTr: string[];
  featuresEn: string[];
  limitationsTr?: string[];
  limitationsEn?: string[];
  ctaTr?: string;
  ctaEn?: string;
  ctaHref?: string;
  recommended?: boolean;
}

export interface Testimonial {
  id: string;
  author: string;
  role: string;
  company: string;
  avatar: string;
  rating: number;
  textTr: string;
  textEn: string;
  toolUsed: string;
}

export interface FaqItem {
  id: string;
  questionTr: string;
  questionEn: string;
  answerTr: string;
  answerEn: string;
  category: 'general' | 'license' | 'security' | 'technical';
}
