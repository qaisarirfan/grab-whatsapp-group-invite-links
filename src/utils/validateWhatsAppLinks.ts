import { load } from 'cheerio';
import pLimit from 'p-limit';

import { getQuarantinedLinks, quarantineLink } from './deadLinkQuarantine';
import { fetchData } from './fetchData';
import type { ProgressTracker } from './progressTracker';

const limit = pLimit(20);

export async function validateWhatsAppLinks(links: string[], progress: ProgressTracker) {
  const tasks = links.map(link =>
    limit(async () => {
      try {
        const html = await fetchData(link);
        const $ = load(html);

        const name = $('#main_block h3').text().trim() || $('meta[property="og:title"]').attr('content') || null;

        progress.success();

        return { link, name, isValid: Boolean(name) };
      } catch (error) {
        progress.failure();
        quarantineLink(link);
        console.error(`\nFailed: ${link}`);
        return null;
      }
    })
  );

  const results = (await Promise.allSettled(tasks)).flatMap(r => (r.status === 'fulfilled' && r.value ? [r.value] : []));

  console.log('\n\nQuarantined links:', getQuarantinedLinks().length);

  return results;
}
