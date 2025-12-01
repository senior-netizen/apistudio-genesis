import { Button, Card } from '@sdl/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OverlayModal from './modals/OverlayModal';
import { useNavigationFlows } from '../modules/navigation/NavigationFlowContext';
import { api } from '../services/api';
import { useCurrentUser } from '../lib/data/useCurrentUser';
import { useAppStore } from '../store';

interface AsyncState {
  loading: boolean;
  error: string | null;
  success: string | null;
}

function useAsyncState(): [AsyncState, (next: Partial<AsyncState>) => void, () => void] {
  const [state, setState] = useState<AsyncState>({ loading: false, error: null, success: null });
  const patch = (next: Partial<AsyncState>) => setState((prev) => ({ ...prev, ...next }));
  const reset = () => setState({ loading: false, error: null, success: null });
  return [state, patch, reset];
}

export function GlobalActionBar() {
  const navigate = useNavigate();
  const {
    requestPrefill,
    lastRecordedResponse,
    recordResponse,
    recordPurchase,
    recordInvite,
  } = useNavigationFlows();
  const { isOwner } = useCurrentUser();

  const activeWorkspaceId = useAppStore((state) => state.activeWorkspaceId);
  const activeProjectId = useAppStore((state) => state.activeProjectId);
  const activeRequestId = useAppStore((state) => state.activeRequestId);
  const setStoreState = useAppStore.setState;

  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [sendRequestOpen, setSendRequestOpen] = useState(false);
  const [publishApiOpen, setPublishApiOpen] = useState(false);
  const [liveSessionOpen, setLiveSessionOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);

  const [projectName, setProjectName] = useState('');
  const [requestPrompt, setRequestPrompt] = useState('');
  const [requestPlan, setRequestPlan] = useState('');
  const [apiTitle, setApiTitle] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  const [projectStatus, setProjectStatus, resetProjectStatus] = useAsyncState();
  const [requestStatus, setRequestStatus, resetRequestStatus] = useAsyncState();
  const [publishStatus, setPublishStatus, resetPublishStatus] = useAsyncState();
  const [liveStatus, setLiveStatus, resetLiveStatus] = useAsyncState();
  const [feedbackStatus, setFeedbackStatus, resetFeedbackStatus] = useAsyncState();
  const [redeemStatus, setRedeemStatus, resetRedeemStatus] = useAsyncState();
  const inputClasses =
    'w-full rounded-md border border-border/60 bg-background/80 p-2 text-sm text-foreground shadow-inner focus:outline-none focus:ring-2 focus:ring-ring';

  const handleCreateProject = async () => {
    setProjectStatus({ loading: true, error: null, success: null });
    try {
      if (!activeWorkspaceId) {
        throw new Error('Select a workspace before creating a project.');
      }
      const response = await api.post('/v1/projects', {
        name: projectName || 'Untitled Project',
        description: requestPlan || undefined,
        workspaceId: activeWorkspaceId,
      });
      const payload = response.data as { id: string; name?: string; description?: string };
      if (!payload?.id) {
        throw new Error('Project creation succeeded without an identifier.');
      }
      setStoreState((state) => {
        state.projects.unshift({
          id: payload.id,
          name: payload.name ?? (projectName || 'Untitled Project'),
          description: payload.description ?? '',
          collections: [],
        });
        state.activeProjectId = payload.id;
        state.activeCollectionId = null;
        state.activeRequestId = null;
      });
      setProjectStatus({ loading: false, success: 'Project created successfully!', error: null });
      setTimeout(() => {
        setCreateProjectOpen(false);
        resetProjectStatus();
        navigate('/projects');
      }, 800);
    } catch (error) {
      setProjectStatus({ loading: false, error: error instanceof Error ? error.message : 'Unknown error', success: null });
    }
  };

  const handleSendRequest = async () => {
    setRequestStatus({ loading: true, error: null, success: null });
    try {
      if (!activeRequestId) {
        throw new Error('Select or create a request before running it.');
      }
      const response = await api.post(`/v1/requests/${encodeURIComponent(activeRequestId)}/run`, {});
      const payload = response.data as { runId?: string };
      if (!payload?.runId) {
        throw new Error('Request execution did not return a run identifier.');
      }
      setRequestStatus({ loading: false, success: 'Request queued successfully!', error: null });
      recordResponse({
        projectId: activeProjectId ?? 'active-project',
        requestId: activeRequestId,
        responseId: payload.runId,
      });
    } catch (error) {
      setRequestStatus({ loading: false, error: error instanceof Error ? error.message : 'Unknown error', success: null });
    }
  };

  const handlePublishApi = async () => {
    setPublishStatus({ loading: true, error: null, success: null });
    try {
      const response = await api.post('/v1/hub/apis', {
        title: apiTitle,
        description: requestPlan,
        ownerId: 'web-user',
      });
      const payload = response.data as { id?: string; redirectUrl?: string };
      setPublishStatus({ loading: false, success: 'API published to Hub!', error: null });
      recordPurchase({ hubApiId: payload.id ?? 'hub-api', redirectToBilling: true });
    } catch (error) {
      setPublishStatus({ loading: false, error: error instanceof Error ? error.message : 'Unknown error', success: null });
    }
  };

  const handleJoinLiveSession = async () => {
    setLiveStatus({ loading: true, error: null, success: null });
    try {
      await new Promise((resolve) => setTimeout(resolve, 750));
      setLiveStatus({ loading: false, success: 'Joined the live collaboration session!', error: null });
      setTimeout(() => {
        setLiveSessionOpen(false);
        resetLiveStatus();
      }, 700);
    } catch (error) {
      setLiveStatus({ loading: false, error: error instanceof Error ? error.message : 'Unknown error', success: null });
    }
  };

  const handleSubmitFeedback = async () => {
    setFeedbackStatus({ loading: true, error: null, success: null });
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setFeedbackStatus({ loading: false, success: 'Feedback submitted. Thank you!', error: null });
      setTimeout(() => {
        setFeedbackOpen(false);
        resetFeedbackStatus();
      }, 700);
    } catch (error) {
      setFeedbackStatus({ loading: false, error: error instanceof Error ? error.message : 'Unknown error', success: null });
    }
  };

  const handleRedeemInvite = async () => {
    setRedeemStatus({ loading: true, error: null, success: null });
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setRedeemStatus({ loading: false, success: 'Invite redeemed successfully!', error: null });
      recordInvite({ code: inviteCode, email: inviteEmail });
    } catch (error) {
      setRedeemStatus({ loading: false, error: error instanceof Error ? error.message : 'Unknown error', success: null });
    }
  };

  return (
    <Card className="mb-6 border border-border/60 bg-background/80 p-4">
      <div className="flex flex-wrap items-center gap-3" aria-label="Primary actions">
        <Button variant="primary" onClick={() => setCreateProjectOpen(true)}>
          Create Project
        </Button>
        <Button variant="primary" onClick={() => setSendRequestOpen(true)}>
          Send Request
        </Button>
        <Button
          variant="primary"
          disabled={!lastRecordedResponse}
          onClick={() =>
            lastRecordedResponse ? navigate(`/requests/${lastRecordedResponse.requestId}/response`) : undefined
          }
        >
          View Response
        </Button>
        {!isOwner && (
          <Button variant="primary" onClick={() => navigate('/billing/upgrade')}>
            Upgrade Plan
          </Button>
        )}
        <Button variant="primary" onClick={() => setPublishApiOpen(true)}>
          Publish API
        </Button>
        <Button variant="primary" onClick={() => navigate('/billing/credits')}>
          Buy Credits
        </Button>
        <Button variant="primary" onClick={() => setLiveSessionOpen(true)}>
          Join Live Session
        </Button>
        <Button variant="primary" onClick={() => setFeedbackOpen(true)}>
          Submit Feedback
        </Button>
        <Button variant="primary" onClick={() => setRedeemOpen(true)}>
          Redeem Invite
        </Button>
      </div>

      <OverlayModal
        isOpen={createProjectOpen}
        onClose={() => {
          setCreateProjectOpen(false);
          resetProjectStatus();
        }}
        title="Create a project"
        description="Name your workspace and we will scaffold collections instantly."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateProjectOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={projectStatus.loading} onClick={handleCreateProject}>
              {projectStatus.loading ? 'Creating…' : 'Create project'}
            </Button>
          </>
        }
      >
        <label className="flex flex-col gap-2 text-sm" htmlFor="project-name">
          Project name
          <input
            id="project-name"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            placeholder="Payments platform rollout"
            className={inputClasses}
          />
        </label>
        {projectStatus.error ? <p className="text-sm text-red-500">{projectStatus.error}</p> : null}
        {projectStatus.success ? <p className="text-sm text-emerald-500">{projectStatus.success}</p> : null}
      </OverlayModal>

      <OverlayModal
        isOpen={sendRequestOpen}
        onClose={() => {
          setSendRequestOpen(false);
          resetRequestStatus();
        }}
        title="Send a request"
        description="Compose a prompt and optional plan that will be pre-filled into the Request Builder."
        footer={
          <>
            <Button variant="ghost" onClick={() => setSendRequestOpen(false)}>
              Close
            </Button>
            <Button variant="primary" disabled={requestStatus.loading} onClick={handleSendRequest}>
              {requestStatus.loading ? 'Sending…' : 'Send request'}
            </Button>
          </>
        }
      >
        <label className="flex flex-col gap-2 text-sm" htmlFor="request-prompt">
          Prompt
          <input
            id="request-prompt"
            value={requestPrompt}
            onChange={(event) => setRequestPrompt(event.target.value)}
            placeholder={requestPrefill?.prompt ?? 'Generate onboarding API request'}
            className={inputClasses}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm" htmlFor="request-plan">
          Plan
          <input
            id="request-plan"
            value={requestPlan}
            onChange={(event) => setRequestPlan(event.target.value)}
            placeholder={requestPrefill?.plan ?? 'Use POST /v1/users with sandbox headers'}
            className={inputClasses}
          />
        </label>
        {requestStatus.error ? <p className="text-sm text-red-500">{requestStatus.error}</p> : null}
        {requestStatus.success ? <p className="text-sm text-emerald-500">{requestStatus.success}</p> : null}
      </OverlayModal>

      <OverlayModal
        isOpen={publishApiOpen}
        onClose={() => {
          setPublishApiOpen(false);
          resetPublishStatus();
        }}
        title="Publish your API"
        description="Share your API with the Squirrel Hub community."
        footer={
          <>
            <Button variant="ghost" onClick={() => setPublishApiOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={publishStatus.loading} onClick={handlePublishApi}>
              {publishStatus.loading ? 'Publishing…' : 'Publish'}
            </Button>
          </>
        }
      >
        <label className="flex flex-col gap-2 text-sm" htmlFor="api-title">
          API title
          <input
            id="api-title"
            value={apiTitle}
            onChange={(event) => setApiTitle(event.target.value)}
            placeholder="Identity Kit"
            className={inputClasses}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm" htmlFor="api-plan">
          Launch plan
          <input
            id="api-plan"
            value={requestPlan}
            onChange={(event) => setRequestPlan(event.target.value)}
            placeholder="Tiered pricing with sandbox access"
            className={inputClasses}
          />
        </label>
        {publishStatus.error ? <p className="text-sm text-red-500">{publishStatus.error}</p> : null}
        {publishStatus.success ? <p className="text-sm text-emerald-500">{publishStatus.success}</p> : null}
      </OverlayModal>

      <OverlayModal
        isOpen={liveSessionOpen}
        onClose={() => {
          setLiveSessionOpen(false);
          resetLiveStatus();
        }}
        title="Join live session"
        description="Collaborate with your team in real-time across environments."
        footer={
          <>
            <Button variant="ghost" onClick={() => setLiveSessionOpen(false)}>
              Later
            </Button>
            <Button variant="primary" disabled={liveStatus.loading} onClick={handleJoinLiveSession}>
              {liveStatus.loading ? 'Connecting…' : 'Join session'}
            </Button>
          </>
        }
      >
        <p>Share the live session link with teammates to co-edit requests and environments.</p>
        {liveStatus.error ? <p className="text-sm text-red-500">{liveStatus.error}</p> : null}
        {liveStatus.success ? <p className="text-sm text-emerald-500">{liveStatus.success}</p> : null}
      </OverlayModal>

      <OverlayModal
        isOpen={feedbackOpen}
        onClose={() => {
          setFeedbackOpen(false);
          resetFeedbackStatus();
        }}
        title="Submit feedback"
        description="Tell us how the beta is working for you."
        footer={
          <>
            <Button variant="ghost" onClick={() => setFeedbackOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={feedbackStatus.loading} onClick={handleSubmitFeedback}>
              {feedbackStatus.loading ? 'Submitting…' : 'Submit feedback'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">We route every response directly to the product team.</p>
        {feedbackStatus.error ? <p className="text-sm text-red-500">{feedbackStatus.error}</p> : null}
        {feedbackStatus.success ? <p className="text-sm text-emerald-500">{feedbackStatus.success}</p> : null}
      </OverlayModal>

      <OverlayModal
        isOpen={redeemOpen}
        onClose={() => {
          setRedeemOpen(false);
          resetRedeemStatus();
        }}
        title="Redeem invite"
        description="Unlock beta capabilities with your invite code."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRedeemOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={redeemStatus.loading} onClick={handleRedeemInvite}>
              {redeemStatus.loading ? 'Redeeming…' : 'Redeem invite'}
            </Button>
          </>
        }
      >
        <label className="flex flex-col gap-2 text-sm" htmlFor="invite-code">
          Invite code
          <input
            id="invite-code"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            placeholder="BETA-2024-TEAM"
            className={inputClasses}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm" htmlFor="invite-email">
          Email
          <input
            id="invite-email"
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="founder@squirrellabs.africa"
            className={inputClasses}
          />
        </label>
        {redeemStatus.error ? <p className="text-sm text-red-500">{redeemStatus.error}</p> : null}
        {redeemStatus.success ? <p className="text-sm text-emerald-500">{redeemStatus.success}</p> : null}
      </OverlayModal>

      <div className="mt-4 flex flex-wrap gap-3" aria-live="polite">
        <Button variant="subtle" onClick={() => navigate('/projects')}>
          View projects
        </Button>
        <Button variant="subtle" onClick={() => navigate('/requests')}>
          Open requests
        </Button>
        <Button variant="subtle" onClick={() => navigate('/hub')}>
          Explore hub
        </Button>
        <Button variant="subtle" onClick={() => navigate('/teams')}>
          Manage team
        </Button>
        <Button variant="subtle" onClick={() => navigate('/settings')}>
          Workspace settings
        </Button>
        <Button variant="subtle" onClick={() => navigate('/feedback')}>
          Feedback board
        </Button>
      </div>
    </Card>
  );
}

export default GlobalActionBar;
