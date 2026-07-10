const params = new URLSearchParams(window.location.search);
const pdfURL = params.get("pdf");
const viewer = document.getElementById("viewer");
if (pdfURL) {
  viewer.innerHTML = `
        <h2>PDF Loaded</h2>

        <p>${pdfURL}</p>

        <hr>

        <p>
            pdf.js will be connected here.
        </p>
    `;
} else {
  viewer.innerHTML = "<h2>No PDF selected.</h2>";
}
