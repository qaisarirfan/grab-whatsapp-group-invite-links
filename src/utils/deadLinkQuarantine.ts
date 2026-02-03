const quarantine = new Set<string>();

export function quarantineLink(link: string) {
  quarantine.add(link);
}

export function getQuarantinedLinks() {
  return Array.from(quarantine);
}
