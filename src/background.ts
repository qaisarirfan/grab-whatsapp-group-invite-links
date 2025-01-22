chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    chrome.tabs.create({
      url: 'https://whatsappzilla.blogspot.com/p/installed-grab-whatsapp-groups-links.html',
      active: true,
    });
  } else if (details.reason === 'update') {
    chrome.tabs.create({
      url: 'https://whatsappzilla.blogspot.com/p/installed-grab-whatsapp-groups-links.html',
      active: true,
    });
  }
});

chrome.runtime.setUninstallURL('https://whatsappzilla.blogspot.com/p/removed-grab-whatsapp-groups-links.html');
