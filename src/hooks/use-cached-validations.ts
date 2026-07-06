import { useCallback, useEffect, useState } from 'react';

import type { LinkValidation, StorageData } from '@src/validation';

export function useCachedValidations(links: string[]) {
  const [validations, setValidations] = useState<Record<string, LinkValidation>>({});
  // Only gates the very first read — later effect runs (e.g. the new-array-reference trick
  // validate-all uses to push live progress) refresh validations silently, without flashing back to loading.
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    const storage = (await chrome.storage.local.get('validations')) as StorageData;
    const stored = storage.validations ?? {};
    const newValidations: Record<string, LinkValidation> = {};
    links.forEach((link) => {
      if (stored[link]) {
        newValidations[link] = stored[link];
      }
    });
    setValidations(newValidations);
    setIsLoading(false);
  }, [links]);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  return { isLoading, reload, validations };
}
