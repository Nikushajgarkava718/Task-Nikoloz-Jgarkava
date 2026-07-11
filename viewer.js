import * as pdfjsLib from "./pdfjs/pdf.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc = "./pdfjs/pdf.worker.mjs";
const params = new URLSearchParams(window.location.search);
const pdfURL = params.get("pdf");
const canvas = document.getElementById("pdfCanvas");
const context = canvas.getContext("2d");
async function renderPDF() {
  if (!pdfURL) {
    alert("PDF not found.");
    return;
  }
  try {
    const pdf = await pdfjsLib.getDocument(pdfURL).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({
      scale: 1.5,
    });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({
      canvasContext: context,
      viewport,
    }).promise;
    console.log("PDF Loaded");
  } catch (error) {
    console.error(error);
  }
}
renderPDF();
