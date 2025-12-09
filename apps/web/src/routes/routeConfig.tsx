import { lazy, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart3,
  Blocks,
  Bot,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  MessageSquareMore,
  Settings,
  Share2,
  Users,
} from 'lucide-react';

const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const ProjectsPage = lazy(() => import('../pages/ProjectsPage'));
const RequestsPage = lazy(() => import('../pages/RequestsPage'));
const AiAssistantPage = lazy(() => import('../pages/AiAssistantPage'));
const BillingPage = lazy(() => import('../pages/BillingPage'));
const FeedbackPage = lazy(() => import('../pages/FeedbackPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const TeamsPage = lazy(() => import('../pages/TeamsPage'));
const HubDetailsPage = lazy(() => import('../pages/HubDetailsPage'));
const ProjectRequestDetailPage = lazy(() => import('../pages/ProjectRequestDetailPage'));
const ResponseDetailPage = lazy(() => import('../pages/ResponseDetailPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));
const ApiStudioPage = lazy(() => import('../pages/ApiStudioPage'));
const MetricsInsightsPage = lazy(() => import('../pages/MetricsInsightsPage'));
const PricingPage = lazy(() => import('../pages/PricingPage'));
const MySubscriptionPage = lazy(() => import('../pages/MySubscriptionPage'));
const PluginSdkPage = lazy(() => import('../pages/PluginSdkPage'));
const HubPage = lazy(() => import('../pages/HubPage'));
const HubExplorePage = lazy(() => import('../pages/HubExplorePage'));
const WatchtowerPage = lazy(() => import('../pages/WatchtowerPage'));
const ForgeDesignerPage = lazy(() => import('../pages/ForgeDesignerPage'));
const SquirrelSyncPage = lazy(() => import('../pages/SquirrelSyncPage'));
const CloudHubPage = lazy(() => import('../pages/CloudHubPage'));
const SecureVaultPage = lazy(() => import('../pages/SecureVaultPage'));
const PluginStorePage = lazy(() => import('../pages/PluginStorePage'));
const CreditsWalletPage = lazy(() => import('../pages/CreditsWalletPage'));
const VerifyReceiptPage = lazy(() => import('../pages/VerifyReceiptPage'));
const AdminPaymentsPage = lazy(() => import('../pages/AdminPaymentsPage'));
const BetaInvitesPage = lazy(() => import('../modules/beta/BetaInvitesPage'));
const BetaFeedbackBoard = lazy(() => import('../modules/beta/BetaFeedbackBoard'));
const BetaAnalytics = lazy(() => import('../modules/beta/BetaAnalytics'));
const GovernancePage = lazy(() =>
  import('../features/governance').then((mod) => ({ default: mod.GovernancePage })),
);

export type RouteGroup =
  | 'Dashboard'
  | 'Build'
  | 'Requests'
  | 'AI'
  | 'Analytics'
  | 'Billing'
  | 'Hub'
  | 'Feedback'
  | 'Settings';

export interface AppRoute {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  group: RouteGroup;
  element: ReactNode;
  summary: string;
  buttons?: string[];
  adminOnly?: boolean;
}

export const appRoutes: AppRoute[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    group: 'Dashboard',
    element: <DashboardPage />,
    summary: 'High-level overview with quick links into projects, requests, and live sessions.',
    buttons: ['Create Project', 'Join Live Session'],
  },
  {
    id: 'projects',
    label: 'Projects',
    path: '/projects',
    icon: ClipboardList,
    group: 'Build',
    element: <ProjectsPage />,
    summary: 'List of API projects and collections with actions to open the request builder.',
    buttons: ['Create Project', 'Publish API'],
  },
  {
    id: 'requests',
    label: 'Requests',
    path: '/requests',
    icon: Share2,
    group: 'Requests',
    element: <RequestsPage />,
    summary: 'Request catalogue with AI pre-fill integration and recent response history.',
    buttons: ['Send Request', 'View Response'],
  },
  {
    id: 'builder',
    label: 'Request Builder',
    path: '/builder',
    icon: Blocks,
    group: 'Build',
    element: <ApiStudioPage />,
    summary: 'Full request builder workspace with collections, environments, and response viewer.',
  },
  {
    id: 'ai',
    label: 'AI Assistant',
    path: '/ai',
    icon: Bot,
    group: 'AI',
    element: <AiAssistantPage />,
    summary: 'Copilot conversation workspace to generate requests and plans.',
    buttons: ['Send Request'],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    icon: BarChart3,
    group: 'Analytics',
    element: <MetricsInsightsPage />,
    summary: 'Platform metrics and observability dashboards.',
  },
  {
    id: 'billing',
    label: 'Billing',
    path: '/billing',
    icon: CreditCard,
    group: 'Billing',
    element: <BillingPage />,
    summary: 'Subscription and credits management with upgrade flow.',
    buttons: ['Upgrade Plan', 'Buy Credits'],
  },
  {
    id: 'credits',
    label: 'Credits Wallet',
    path: '/billing/credits',
    icon: CreditCard,
    group: 'Billing',
    element: <CreditsWalletPage />,
    summary: 'Manage credit balance and purchase history.',
  },
  {
    id: 'pricing',
    label: 'Pricing',
    path: '/billing/upgrade',
    icon: CreditCard,
    group: 'Billing',
    element: <PricingPage />,
    summary: 'Plan comparison for upgrade flow.',
  },
  {
    id: 'subscription',
    label: 'Subscription',
    path: '/billing/subscription',
    icon: CreditCard,
    group: 'Billing',
    element: <MySubscriptionPage />,
    summary: 'Detailed subscription configuration and receipts.',
  },
  {
    id: 'admin-payments',
    label: 'Admin Payments',
    path: '/admin/payments',
    icon: Activity,
    group: 'Billing',
    element: <AdminPaymentsPage />,
    summary: 'Administer payment pipelines and settlement health.',
    adminOnly: true,
  },
  {
    id: 'hub',
    label: 'Hub',
    path: '/hub',
    icon: Blocks,
    group: 'Hub',
    element: <HubPage />,
    summary: 'Published APIs and marketplace analytics.',
    buttons: ['Publish API'],
  },
  {
    id: 'hub-explore',
    label: 'Hub Explore',
    path: '/hub/explore',
    icon: Blocks,
    group: 'Hub',
    element: <HubExplorePage />,
    summary: 'Discover APIs with AI guidance and dynamic routing.',
  },
  {
    id: 'plugins',
    label: 'Plugins',
    path: '/plugins',
    icon: Blocks,
    group: 'Hub',
    element: <PluginSdkPage />,
    summary: 'Plugin SDK and marketplace publishing.',
  },
  {
    id: 'plugin-store',
    label: 'Plugin Store',
    path: '/plugins/store',
    icon: Blocks,
    group: 'Hub',
    element: <PluginStorePage />,
    summary: 'Marketplace storefront for curated plugins.',
  },
  {
    id: 'feedback',
    label: 'Feedback',
    path: '/feedback',
    icon: MessageSquareMore,
    group: 'Feedback',
    element: <FeedbackPage />,
    summary: 'Feedback board and beta analytics for continuous collaboration.',
    buttons: ['Submit Feedback', 'Redeem Invite'],
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: Settings,
    group: 'Settings',
    element: <SettingsPage />,
    summary: 'Workspace configuration and secret management.',
  },
  {
    id: 'governance',
    label: 'Governance',
    path: '/settings/:workspaceId/governance',
    icon: Settings,
    group: 'Settings',
    element: <GovernancePage />,
    summary: 'Enterprise data governance center with retention, backups, and audit.',
  },
  {
    id: 'teams',
    label: 'Teams',
    path: '/teams',
    icon: Users,
    group: 'Settings',
    element: <TeamsPage />,
    summary: 'Team management and invite flows.',
    buttons: ['Join Live Session', 'Redeem Invite'],
  },
  {
    id: 'watchtower',
    label: 'Watchtower',
    path: '/watchtower',
    icon: Activity,
    group: 'Analytics',
    element: <WatchtowerPage />,
    summary: 'Runtime incident observability.',
  },
  {
    id: 'forge',
    label: 'Forge Designer',
    path: '/forge',
    icon: Blocks,
    group: 'Build',
    element: <ForgeDesignerPage />,
    summary: 'Schema and mock designer.',
  },
  {
    id: 'sync',
    label: 'Squirrel Sync',
    path: '/sync',
    icon: Share2,
    group: 'Build',
    element: <SquirrelSyncPage />,
    summary: 'Environment promotion workflows.',
  },
  {
    id: 'cloud',
    label: 'Cloud Hub',
    path: '/cloud',
    icon: Share2,
    group: 'Analytics',
    element: <CloudHubPage />,
    summary: 'Global infrastructure state and deployments.',
  },
  {
    id: 'securevault',
    label: 'Secure Vault',
    path: '/securevault',
    icon: Settings,
    group: 'Settings',
    element: <SecureVaultPage />,
    summary: 'Secret storage policies and audit logs.',
  },
  {
    id: 'beta-invites',
    label: 'Beta Invites',
    path: '/admin/beta/invites',
    icon: Users,
    group: 'Feedback',
    element: <BetaInvitesPage />,
    summary: 'Manage beta cohorts and invite codes.',
    adminOnly: true,
  },
  {
    id: 'beta-feedback',
    label: 'Beta Feedback',
    path: '/admin/beta/feedback',
    icon: MessageSquareMore,
    group: 'Feedback',
    element: <BetaFeedbackBoard />,
    summary: 'Triage tester feedback.',
    adminOnly: true,
  },
  {
    id: 'beta-analytics',
    label: 'Beta Analytics',
    path: '/admin/beta/analytics',
    icon: BarChart3,
    group: 'Feedback',
    element: <BetaAnalytics />,
    summary: 'Analyse beta adoption metrics.',
    adminOnly: true,
  },
];

export const auxiliaryRoutes = [
  { path: '/hub/:id', element: <HubDetailsPage /> },
  { path: '/hub/:id/purchase', element: <HubDetailsPage /> },
  { path: '/project/:projectId/request/:requestId', element: <ProjectRequestDetailPage /> },
  { path: '/requests/:requestId/response', element: <ResponseDetailPage /> },
  { path: '/copilot', element: <AiAssistantPage /> },
  { path: '/subscription', element: <MySubscriptionPage /> },
  { path: '/verify-receipt/:hash', element: <VerifyReceiptPage /> },
];

export const notFoundRoute = { path: '*', element: <NotFoundPage /> };

export function getNavigationSummary() {
  return appRoutes.map((route) => ({
    path: route.path,
    component: route.element?.constructor?.name ?? 'LazyComponent',
    label: route.label,
    buttons: route.buttons ?? [],
    group: route.group,
  }));
}
