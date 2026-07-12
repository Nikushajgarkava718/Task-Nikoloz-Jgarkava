document.getElementById("openViewer").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!tab || !tab.url) {
    alert("No active tab found.");
    return;
  }

  const viewerUrl =
    chrome.runtime.getURL("viewer.html") +
    "?pdf=" +
    encodeURIComponent(tab.url);

  chrome.tabs.create({
    url: viewerUrl,
  });
});
