document.getElementById("openViewer").addEventListener("click", async () => {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!tabs.length) return;

  const currentTab = tabs[0];

  chrome.tabs.create({
    url:
      chrome.runtime.getURL("viewer.html") +
      "?pdf=" +
      encodeURIComponent(currentTab.url),
  });
});
