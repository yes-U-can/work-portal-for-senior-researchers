import type { RecoveryGuidance } from "@/lib/integrations/types";

export class ConnectorError extends Error {
  recoveryAction: string;

  constructor(message: string, recoveryAction: string) {
    super(message);
    this.name = "ConnectorError";
    this.recoveryAction = recoveryAction;
  }
}

export function normalizeConnectorError(
  error: unknown,
  fallbackMessage: string,
  fallbackRecoveryAction: string
): RecoveryGuidance {
  if (error instanceof ConnectorError) {
    return {
      message: error.message,
      recoveryAction: error.recoveryAction
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message || fallbackMessage,
      recoveryAction: fallbackRecoveryAction
    };
  }

  return {
    message: fallbackMessage,
    recoveryAction: fallbackRecoveryAction
  };
}
