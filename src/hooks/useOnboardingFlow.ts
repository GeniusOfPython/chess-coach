import { useCallback, useState } from "react";
import type {
  DiagnosticProfile,
  ExperienceLevel,
  LearningGoal,
} from "../analysis/diagnosticProfile";
import {
  onboardingRepository,
  type OnboardingSnapshot,
} from "../repositories/onboardingRepository";

type DiagnosticSelection = {
  goal: LearningGoal;
  experience: ExperienceLevel;
};

export function useOnboardingFlow() {
  const [state, setState] = useState<OnboardingSnapshot>(
    onboardingRepository.load,
  );

  const persist = useCallback((snapshot: OnboardingSnapshot) => {
    onboardingRepository.save(snapshot);
    setState(snapshot);
  }, []);

  const startDiagnostic = useCallback((selection: DiagnosticSelection) => {
    persist({
      version: 1,
      status: "diagnostic",
      ...selection,
      startedAt: new Date().toISOString(),
    });
  }, [persist]);

  const skip = useCallback(() => {
    persist({ version: 1, status: "skipped" });
  }, [persist]);

  const completeDiagnostic = useCallback((result: DiagnosticProfile) => {
    setState((current) => {
      if (current.status !== "diagnostic") {
        return current;
      }

      const completed: OnboardingSnapshot = {
        ...current,
        status: "complete",
        completedAt: new Date().toISOString(),
        result,
        resultDismissed: false,
      };
      onboardingRepository.save(completed);
      return completed;
    });
  }, []);

  const dismissResult = useCallback(() => {
    setState((current) => {
      if (current.status !== "complete" || current.resultDismissed) {
        return current;
      }

      const dismissed: OnboardingSnapshot = {
        ...current,
        resultDismissed: true,
      };
      onboardingRepository.save(dismissed);
      return dismissed;
    });
  }, []);

  return {
    state,
    startDiagnostic,
    skip,
    completeDiagnostic,
    dismissResult,
  };
}
