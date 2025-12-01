import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';

type RequestPrefill = {
  prompt: string;
  plan: string;
};

type RecordedResponse = {
  requestId: string;
  projectId: string;
  responseId: string;
};

type PurchaseRecord = {
  hubApiId: string;
  redirectToBilling?: boolean;
};

type InviteRedemption = {
  code: string;
  email: string;
};

type NavigationFlowState = {
  requestPrefill: RequestPrefill | null;
  lastRecordedResponse: RecordedResponse | null;
  lastPurchase: PurchaseRecord | null;
  inviteRedemption: InviteRedemption | null;
};

type NavigationFlowEvent =
  | { type: 'prefill-request'; payload: RequestPrefill }
  | { type: 'clear-prefill' }
  | { type: 'record-response'; payload: RecordedResponse }
  | { type: 'record-purchase'; payload: PurchaseRecord }
  | { type: 'record-invite'; payload: InviteRedemption };

const initialState: NavigationFlowState = {
  requestPrefill: null,
  lastRecordedResponse: null,
  lastPurchase: null,
  inviteRedemption: null,
};

function reducer(state: NavigationFlowState, event: NavigationFlowEvent): NavigationFlowState {
  switch (event.type) {
    case 'prefill-request':
      return { ...state, requestPrefill: event.payload };
    case 'clear-prefill':
      return { ...state, requestPrefill: null };
    case 'record-response':
      return { ...state, lastRecordedResponse: event.payload };
    case 'record-purchase':
      return { ...state, lastPurchase: event.payload };
    case 'record-invite':
      return { ...state, inviteRedemption: event.payload };
    default:
      return state;
  }
}

type NavigationFlowContextValue = NavigationFlowState & {
  prefillRequestFromAi(prompt: string, plan: string): void;
  clearPrefill(): void;
  recordResponse(details: RecordedResponse): void;
  recordPurchase(details: PurchaseRecord): void;
  recordInvite(details: InviteRedemption): void;
};

const NavigationFlowContext = createContext<NavigationFlowContextValue | undefined>(undefined);

export function NavigationFlowProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(reducer, initialState);
  const lastAction = useRef<string | null>(null);

  const prefillRequestFromAi = useCallback(
    (prompt: string, plan: string) => {
      dispatch({ type: 'prefill-request', payload: { prompt, plan } });
      lastAction.current = 'prefill-request';
      navigate('/requests', { replace: false });
      console.info('[navigation] AI suggestion pre-filled request builder.', { prompt, plan });
    },
    [navigate],
  );

  const clearPrefill = useCallback(() => {
    dispatch({ type: 'clear-prefill' });
    lastAction.current = 'clear-prefill';
  }, []);

  const recordResponse = useCallback(
    (details: RecordedResponse) => {
      dispatch({ type: 'record-response', payload: details });
      lastAction.current = 'record-response';
      console.info('[navigation] Recorded response from request builder.', details);
    },
    [],
  );

  const recordPurchase = useCallback(
    (details: PurchaseRecord) => {
      dispatch({ type: 'record-purchase', payload: details });
      lastAction.current = 'record-purchase';
      if (details.redirectToBilling) {
        navigate('/billing', { replace: false });
      }
      console.info('[navigation] Hub purchase completed.', details);
    },
    [navigate],
  );

  const recordInvite = useCallback((details: InviteRedemption) => {
    dispatch({ type: 'record-invite', payload: details });
    lastAction.current = 'record-invite';
    navigate('/feedback', { replace: false });
    console.info('[navigation] Invite redeemed and redirected to feedback.', details);
  }, [navigate]);

  const value = useMemo<NavigationFlowContextValue>(
    () => ({
      ...state,
      prefillRequestFromAi,
      clearPrefill,
      recordResponse,
      recordPurchase,
      recordInvite,
    }),
    [state, prefillRequestFromAi, clearPrefill, recordResponse, recordPurchase, recordInvite],
  );

  return <NavigationFlowContext.Provider value={value}>{children}</NavigationFlowContext.Provider>;
}

export function useNavigationFlows() {
  const context = useContext(NavigationFlowContext);
  if (!context) {
    throw new Error('useNavigationFlows must be used within a NavigationFlowProvider');
  }
  return context;
}
