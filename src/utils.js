export const inviteLink = (link) => {
  if (!link) return null;
  if (link.includes('chat.whatsapp.com')) {
    const regex = /https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{22}/gm;
    const result = link.replace('/invite', '');
    const group = result.match(regex);
    if (group) return group[0];
    return null;
  }
  return null;
};

export const isValidURL = (string) => {
  const res = string.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)/g);
  return (res !== null);
};

export const isGoogle = (location) => {
  if (!location) return false;
  const url = new URL(location);
  return `${url?.origin}${url?.pathname}` === 'https://www.google.com/search';
};

export const copyToClipboard = async (text) => {
  await navigator.clipboard.writeText(text);
};

// eslint-disable-next-line no-promise-executor-return
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default {
  inviteLink,
  isValidURL,
  isGoogle,
  copyToClipboard,
  sleep,
};
