chrome.runtime.onInstalled.addListener((details) => {
  chrome.contextMenus.create({
    id: 'open-side-panel',
    title: 'Open in side panel',
    contexts: ['action', 'page'],
  });

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

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'open-side-panel' && tab?.windowId !== undefined) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

chrome.runtime.setUninstallURL('https://whatsappzilla.blogspot.com/p/removed-grab-whatsapp-groups-links.html');
