import { useEffect, useMemo, useRef } from 'react';
import { Loader2, LogIn, Network, RefreshCcw, RotateCcw, Sparkles, Waves } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/toast';
import { useAppStore } from '../store';
import { sanitizeErrorMessage } from '../utils/errorSanitizer';
import { useAuthStore } from '../modules/auth/authStore';

export function useToastEvents() {
  const { push, dismiss } = useToast();
  const navigate = useNavigate();
  const sendRequest = useAppStore((state) => state.sendRequest);
  const setActiveEnvironment = useAppStore((state) => state.setActiveEnvironment);
  const knownTabs = useRef<Set<string>>(new Set());
  const previousEnvId = useRef<string | null>(null);

  useEffect(() => {
    const offlineId = 'network-status';
    const showOffline = () => {
      push({
        id: offlineId,
        title: 'You are offline',
        description: 'We will keep your edits safe. Reconnect to send or sync.',
        tone: 'warning',
        channel: 'network',
        duration: 0,
        actions: [
          {
            label: 'Try again',
            icon: RefreshCcw,
            onClick: () => {
              if (navigator.onLine) {
                dismiss(offlineId);
                push({ title: 'Back online', description: 'Reconnected to the workspace.', tone: 'success', channel: 'network' });
              }
            },
            emphasis: 'primary',
          },
        ],
        accent: 'bg-gradient-to-br from-sky-500/80 to-cyan-500/70 text-white',
        icon: Network,
      });
    };
    const handleOnline = () => {
      dismiss(offlineId);
      push({ title: 'Back online', description: 'Network connection restored.', tone: 'success', channel: 'network' });
    };
    const handleOffline = () => showOffline();

    if (!navigator.onLine) {
      showOffline();
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dismiss, push]);

  useEffect(() => {
    const unsubscribe = useAppStore.subscribe(
      (state) => ({
        response: state.response,
        responseError: state.responseError,
        isSending: state.isSending,
      }),
      (next, previous) => {
        if (previous?.isSending && !next.isSending && next.response) {
          const cachedHeader = next.response.headers['x-cache'] ?? next.response.headers['age'];
          push({
            title: 'Request completed',
            description: `${next.response.status} ${next.response.statusText}`.trim(),
            tone: next.response.status < 400 ? 'success' : 'warning',
            channel: 'request',
            actions: [
              {
                label: 'Open logs',
                icon: Waves,
                onClick: () => navigate('/watchtower'),
              },
            ],
          });
          if (cachedHeader) {
            push({
              title: 'Served from cache',
              description: typeof cachedHeader === 'string' ? cachedHeader : 'Response reused for speed.',
              tone: 'info',
              channel: 'request',
              actions: [
                {
                  label: 'Inspect history',
                  onClick: () => navigate('/requests'),
                },
              ],
            });
          }
        }

        if (previous?.isSending && !next.isSending && next.responseError) {
          const message = sanitizeErrorMessage(next.responseError);
          push({
            title: 'Request failed',
            description: message || 'The request could not be completed.',
            tone: 'danger',
            channel: 'request',
            duration: 0,
            actions: [
              {
                label: 'Retry now',
                icon: RotateCcw,
                onClick: () => void sendRequest(),
                emphasis: 'primary',
              },
              {
                label: 'Open logs',
                icon: Waves,
                onClick: () => navigate('/watchtower'),
              },
              {
                label: 'Report anonymously',
                icon: Sparkles,
                onClick: () => navigate('/feedback?source=request-error'),
              },
            ],
          });
        }
      },
    );

    return () => unsubscribe();
  }, [navigate, push, sendRequest]);

  useEffect(() => {
    const unsubscribe = useAppStore.subscribe(
      (state) => ({
        request: state.workingRequest,
        envId: state.activeEnvironmentId,
        environments: state.environments,
      }),
      (next) => {
        if (!next.request || !next.envId) return;
        const active = next.environments.find((env) => env.id === next.envId);
        if (!active) return;
        const baseUrlVar = active.variables.find((variable) => variable.enabled && variable.key.toLowerCase() === 'baseurl');
        if (!baseUrlVar?.value) return;

        const requestUrl = next.request.url.includes('{{baseUrl}}')
          ? next.request.url.replace('{{baseUrl}}', baseUrlVar.value)
          : next.request.url;

        let requestHost: string | null = null;
        let envHost: string | null = null;
        try {
          requestHost = new URL(requestUrl).host;
          envHost = new URL(baseUrlVar.value).host;
        } catch (error) {
          return;
        }

        if (!requestHost || !envHost || requestHost === envHost) {
          return;
        }

        const match = next.environments.find((env) => {
          const candidate = env.variables.find((variable) => variable.enabled && variable.key.toLowerCase() === 'baseurl');
          if (!candidate?.value) return false;
          try {
            return new URL(candidate.value).host === requestHost;
          } catch (error) {
            return false;
          }
        });

        if (match && match.id !== next.envId) {
          if (previousEnvId.current === match.id) {
            return;
          }
          const previous = next.envId;
          setActiveEnvironment(match.id);
          push({
            title: 'Environment adjusted',
            description: `Switched to ${match.name} for ${requestHost}.`,
            tone: 'warning',
            channel: 'request',
            actions: [
              {
                label: 'Undo switch',
                icon: RotateCcw,
                onClick: () => setActiveEnvironment(previous),
              },
              {
                label: 'Open logs',
                icon: Waves,
                onClick: () => navigate('/watchtower'),
              },
            ],
          });
          previousEnvId.current = previous;
        } else {
          previousEnvId.current = null;
          push({
            title: 'Environment mismatch',
            description: `Active environment does not match ${requestHost}.`,
            tone: 'warning',
            channel: 'request',
            actions: [
              {
                label: 'Review environments',
                onClick: () => navigate('/settings'),
              },
            ],
          });
        }
      },
    );

    return () => unsubscribe();
  }, [navigate, push, setActiveEnvironment]);

  useEffect(() => {
    const unsubscribe = useAppStore.subscribe(
      (state) => state.openRequestTabs,
      (nextTabs) => {
        nextTabs.forEach((tab) => {
          if (!knownTabs.current.has(tab.requestId) && tab.title.toLowerCase().includes('copy')) {
            push({
              title: 'Working copy ready',
              description: `${tab.title} duplicated into a fresh tab.`,
              tone: 'info',
              channel: 'request',
              actions: [
                {
                  label: 'Open logs',
                  icon: Waves,
                  onClick: () => navigate('/watchtower'),
                },
              ],
            });
          }
          knownTabs.current.add(tab.requestId);
        });
      },
    );

    return () => unsubscribe();
  }, [navigate, push]);

  useEffect(() => {
    const clearSessionError = useAuthStore.getState().setSessionError;
    const unsubscribe = useAuthStore.subscribe(
      (state) => state.sessionError,
      (sessionError) => {
        if (!sessionError) return;
        const message = sanitizeErrorMessage(sessionError);
        push({
          title: 'Session requires attention',
          description: message || 'Your session expired. Re-authenticate to continue.',
          tone: 'warning',
          channel: 'auth',
          duration: 0,
          actions: [
            {
              label: 'Re-login',
              icon: LogIn,
              onClick: () => navigate('/login'),
              emphasis: 'primary',
            },
            {
              label: 'Refresh session',
              icon: Loader2,
              onClick: () => navigate('/login'),
            },
          ],
        });
        clearSessionError?.(undefined);
      },
    );

    return () => unsubscribe();
  }, [navigate, push]);

  return useMemo(() => ({
    push,
    dismiss,
  }), [dismiss, push]);
}
