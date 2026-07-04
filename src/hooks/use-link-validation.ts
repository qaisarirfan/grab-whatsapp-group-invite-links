import { type Dispatch, type SetStateAction, useRef, useState } from 'react';

import Analytics from '@src/analytics';
import { validateMultipleLinksWithProgress } from '@src/validation';

export function useLinkValidation(links: string[], setLinks: Dispatch<SetStateAction<string[]>>) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState({ done: 0, total: 0 });
  const [inFlightLinks, setInFlightLinks] = useState<string[]>([]);
  const [autoValidate, setAutoValidate] = useState(false);
  const autoValidateRef = useRef(false);

  const loadAutoValidateSetting = async () => {
    const stored = (await chrome.storage.local.get('autoValidate')) as { autoValidate?: boolean };
    autoValidateRef.current = stored.autoValidate ?? false;
    setAutoValidate(autoValidateRef.current);
  };

  const validateAllLinks = async (targetLinks: string[] = links) => {
    Analytics.fireEvent('validate_links_started', { total_links: targetLinks.length });
    setValidationProgress({ done: 0, total: targetLinks.length });
    setInFlightLinks([]);
    setIsValidating(true);
    try {
      await validateMultipleLinksWithProgress(
        targetLinks,
        (done, link) => {
          setValidationProgress((prev) => ({ ...prev, done }));
          setInFlightLinks((prev) => prev.filter((l) => l !== link));
          // Trigger a re-render of the links component to show each result as it arrives
          setLinks((prev) => [...prev]);
        },
        (link) => setInFlightLinks((prev) => (prev.includes(link) ? prev : [...prev, link]))
      );
      Analytics.fireEvent('validate_links_completed', { total_links: targetLinks.length });
    } catch (error) {
      Analytics.fireErrorEvent({
        context: 'validate_links_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsValidating(false);
      setInFlightLinks([]);
    }
  };

  const toggleAutoValidate = (value: boolean) => {
    autoValidateRef.current = value;
    setAutoValidate(value);
    chrome.storage.local.set({ autoValidate: value }).catch(() => {});
  };

  return {
    autoValidate,
    autoValidateRef,
    inFlightLinks,
    isValidating,
    loadAutoValidateSetting,
    toggleAutoValidate,
    validateAllLinks,
    validationProgress,
  };
}
