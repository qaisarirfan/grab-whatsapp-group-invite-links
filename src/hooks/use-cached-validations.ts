import { useEffect, useState } from 'react';

import type { LinkValidation, StorageData } from '@src/validation';

export function useCachedValidations(links: string[]) {
  const [validations, setValidations] = useState<Record<string, LinkValidation>>({});

  useEffect(() => {
    const loadValidations = async () => {
      const storage = (await chrome.storage.local.get('validations')) as StorageData;
      const stored = storage.validations ?? {};
      const newValidations: Record<string, LinkValidation> = {};
      links.forEach((link) => {
        if (stored[link]) {
          newValidations[link] = stored[link];
        }
      });
      setValidations(newValidations);
    };
    loadValidations();
  }, [links]);

  return validations;
}
