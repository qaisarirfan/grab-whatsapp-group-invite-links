import { type Dispatch, type SetStateAction, useRef, useState } from 'react';

import Analytics from '@src/analytics';
import { validateMultipleLinksWithProgress } from '@src/validation';

export function useLinkValidation(links: string[], setLinks: Dispatch<SetStateAction<string[]>>) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState({ done: 0, total: 0 });
  const [inFlightLinks, setInFlightLinks] = useState<string[]>([]);
  // Every link still awaiting a result this run — a superset of inFlightLinks that also covers
  // links queued behind Bottleneck's concurrency limit (see validationLimiter in src/validation.ts).
  const [queuedLinks, setQueuedLinks] = useState<string[]>([]);
  const [autoValidate, setAutoValidate] = useState(false);
  const autoValidateRef = useRef(false);
  // Bumped by cancelValidation/retryValidation so a superseded run's own callbacks become
  // no-ops instead of racing a newer run's state updates (see cancel/retry comments below).
  const runIdRef = useRef(0);

  const loadAutoValidateSetting = async () => {
    const stored = (await chrome.storage.local.get('autoValidate')) as { autoValidate?: boolean };
    autoValidateRef.current = stored.autoValidate ?? false;
    setAutoValidate(autoValidateRef.current);
  };

  const validateAllLinks = async (targetLinks: string[] = links) => {
    const runId = (runIdRef.current += 1);
    const isCurrentRun = () => runIdRef.current === runId;

    Analytics.fireEvent('validate_links_started', { total_links: targetLinks.length });
    setValidationProgress({ done: 0, total: targetLinks.length });
    setInFlightLinks([]);
    setQueuedLinks(targetLinks);
    setIsValidating(true);
    try {
      await validateMultipleLinksWithProgress(
        targetLinks,
        (done, link) => {
          if (!isCurrentRun()) return;
          setValidationProgress((prev) => ({ ...prev, done }));
          setInFlightLinks((prev) => prev.filter((l) => l !== link));
          setQueuedLinks((prev) => prev.filter((l) => l !== link));
          // Trigger a re-render of the links component to show each result as it arrives
          setLinks((prev) => [...prev]);
        },
        (link) => {
          if (!isCurrentRun()) return;
          setInFlightLinks((prev) => (prev.includes(link) ? prev : [...prev, link]));
        }
      );
      if (isCurrentRun()) {
        Analytics.fireEvent('validate_links_completed', { total_links: targetLinks.length });
      }
    } catch (error) {
      if (isCurrentRun()) {
        Analytics.fireErrorEvent({
          context: 'validate_links_error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } finally {
      if (isCurrentRun()) {
        setIsValidating(false);
        setInFlightLinks([]);
        setQueuedLinks([]);
      }
    }
  };

  const toggleAutoValidate = (value: boolean) => {
    autoValidateRef.current = value;
    setAutoValidate(value);
    chrome.storage.local.set({ autoValidate: value }).catch(() => {});
  };

  // Doesn't abort the in-flight requests (validateLink's own 8s timeout handles that eventually,
  // and validateLinkWithStorage's in-flight map dedupes against a later retry targeting the same
  // link) — it just stops blocking the UI on them, so the user can retry instead of waiting them out.
  const cancelValidation = () => {
    Analytics.fireEvent('validate_links_cancelled', { remaining_links: queuedLinks.length });
    runIdRef.current += 1; // supersede this run so its still-pending callbacks become no-ops
    setIsValidating(false);
    setInFlightLinks([]);
    setQueuedLinks([]);
  };

  // Restarts validation for just what's left in the queue, instead of re-checking links that
  // already finished this run.
  const retryValidation = () => {
    const remainingLinks = queuedLinks;
    Analytics.fireEvent('validate_links_retried', { remaining_links: remainingLinks.length });
    runIdRef.current += 1; // supersede the stalled run before starting a fresh one
    setIsValidating(false);
    setInFlightLinks([]);
    setQueuedLinks([]);
    if (remainingLinks.length > 0) {
      validateAllLinks(remainingLinks);
    }
  };

  return {
    autoValidate,
    autoValidateRef,
    cancelValidation,
    inFlightLinks,
    isValidating,
    loadAutoValidateSetting,
    retryValidation,
    toggleAutoValidate,
    validateAllLinks,
    validationProgress,
  };
}
