export interface ProductAnnouncement {
  id: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  publishedAt: string;
  audience?: 'all' | 'beta' | 'enterprise';
  tag?: string;
}
