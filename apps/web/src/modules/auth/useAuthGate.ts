import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

interface GateOptions {
  protectedFeature: string;
  onUnauthenticated?: () => void;
}

export function useAuthGate() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(
    (options: GateOptions): boolean => {
      if (isAuthenticated) {
        return true;
      }

      options.onUnauthenticated?.();
      navigate("/login", {
        state: {
          from: `${location.pathname}${location.search}${location.hash}`,
          reason: `auth_required:${options.protectedFeature}`,
        },
      });
      return false;
    },
    [
      isAuthenticated,
      location.hash,
      location.pathname,
      location.search,
      navigate,
    ],
  );
}
