import * as pdfjsLib from "./pdfjs/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL(
  "pdfjs/pdf.worker.mjs",
);

const params = new URLSearchParams(window.location.search);
const pdfURL = params.get("pdf");

const viewerContainer = document.getElementById("viewerContainer");
const statusEl = document.getElementById("status");

let sentences = [];
let currentSentenceIndex = -1;
let pageData = [];

// ინგლისური/ქართული წინადადებების უხეში გამყოფი
const SENTENCE_REGEX = /[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g;

async function loadPDF() {
  if (!pdfURL) {
    statusEl.textContent =
      "PDF URL ვერ მოიძებნა. გახსენი extension-ის popup-იდან, PDF-ის ტაბზე მდგომმა.";
    return;
  }

  statusEl.textContent = "იტვირთება PDF...";
  console.log("Loading PDF from:", pdfURL);

  try {
    let loadingTask;

    if (pdfURL.startsWith("file://")) {
      const response = await fetch(pdfURL);
      if (!response.ok) {
        throw new Error(
          "ფაილის წაკითხვა ვერ მოხერხდა (სტატუსი: " + response.status + ")",
        );
      }
      const arrayBuffer = await response.arrayBuffer();
      loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    } else {
      loadingTask = pdfjsLib.getDocument(pdfURL);
    }

    const pdf = await loadingTask.promise;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      await renderPage(page, pageNum - 1);
    }

    buildSentences();

    if (sentences.length > 0) {
      currentSentenceIndex = 0;
      highlightSentence(currentSentenceIndex);
      statusEl.textContent = `წინადადება 1 / ${sentences.length}`;
    } else {
      statusEl.textContent = "ტექსტი ვერ მოიძებნა ამ PDF-ში.";
    }
  } catch (error) {
    console.error(error);
    statusEl.textContent = "შეცდომა PDF-ის ჩატვირთვისას: " + error.message;
  }
}

async function renderPage(page, pageIndex) {
  const scale = 1.5;
  const viewport = page.getViewport({ scale });

  const pageWrapper = document.createElement("div");
  pageWrapper.className = "pageWrapper";
  pageWrapper.style.width = viewport.width + "px";
  pageWrapper.style.height = viewport.height + "px";

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext("2d");

  const textLayerDiv = document.createElement("div");
  textLayerDiv.className = "textLayer";
  textLayerDiv.style.width = viewport.width + "px";
  textLayerDiv.style.height = viewport.height + "px";

  pageWrapper.appendChild(canvas);
  pageWrapper.appendChild(textLayerDiv);
  viewerContainer.appendChild(pageWrapper);

  await page.render({ canvasContext: context, viewport }).promise;

  const textContent = await page.getTextContent();
  const items = [];
  let cursor = 0;
  let fullText = "";

  textContent.items.forEach((item) => {
    if (!item.str) return;

    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const angle = Math.atan2(tx[1], tx[0]);
    const fontHeight = Math.hypot(tx[2], tx[3]);

    const span = document.createElement("span");
    span.textContent = item.str;
    span.style.left = tx[4] + "px";
    span.style.top = tx[5] - fontHeight + "px";
    span.style.fontSize = fontHeight + "px";
    span.style.fontFamily = item.fontName || "sans-serif";
    if (angle !== 0) {
      span.style.transform = `rotate(${angle}rad)`;
      span.style.transformOrigin = "0% 0%";
    }
    textLayerDiv.appendChild(span);

    const start = cursor;
    const str = item.str + (item.hasEOL ? "\n" : " ");
    fullText += str;
    cursor += str.length;

    items.push({ span, start, end: cursor });
  });

  pageData.push({ pageIndex, items, fullText });
}

function buildSentences() {
  sentences = [];

  pageData.forEach((page) => {
    const matches = page.fullText.match(SENTENCE_REGEX);
    if (!matches) return;

    let offset = 0;
    matches.forEach((sentenceText) => {
      const start = offset;
      const end = offset + sentenceText.length;
      offset = end;

      const involvedItems = page.items.filter(
        (item) => item.start < end && item.end > start,
      );

      if (involvedItems.length > 0) {
        sentences.push({
          pageIndex: page.pageIndex,
          items: involvedItems,
          text: sentenceText.trim(),
        });
      }
    });
  });
}

function clearHighlight(index) {
  const sentence = sentences[index];
  if (!sentence) return;
  sentence.items.forEach((item) =>
    item.span.classList.remove("activeSentence"),
  );
}

function highlightSentence(index) {
  const sentence = sentences[index];
  if (!sentence) return;

  sentence.items.forEach((item) => item.span.classList.add("activeSentence"));
  sentence.items[0].span.scrollIntoView({
    block: "center",
    behavior: "smooth",
  });
}

function goToSentence(newIndex) {
  if (newIndex < 0 || newIndex >= sentences.length) return;

  clearHighlight(currentSentenceIndex);
  currentSentenceIndex = newIndex;
  highlightSentence(currentSentenceIndex);

  statusEl.textContent = `წინადადება ${currentSentenceIndex + 1} / ${
    sentences.length
  }`;
}

window.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    if (e.shiftKey) {
      goToSentence(currentSentenceIndex - 1);
    } else {
      goToSentence(currentSentenceIndex + 1);
    }
  }
});

loadPDF();
