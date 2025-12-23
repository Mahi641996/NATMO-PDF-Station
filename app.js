let selectedFiles = [];

/* ===============================
   FILE INPUT HANDLER
================================ */
document.getElementById("fileInput").addEventListener("change", (e) => {
  selectedFiles = Array.from(e.target.files);
});

/* ===============================
   HELPER FUNCTIONS
================================ */
function getSinglePDF() {
  const pdfs = selectedFiles.filter(f => f.type === "application/pdf");
  if (pdfs.length !== 1) {
    alert("Please select exactly ONE PDF file.");
    return null;
  }
  return pdfs[0];
}

function downloadPDF(bytes, filename) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function readFile(file) {
  return file.arrayBuffer();
}

/* ===============================
   1️⃣ MERGE PDF
================================ */
async function mergePDF() {
  const pdfs = selectedFiles.filter(f => f.type === "application/pdf");
  if (pdfs.length < 2) {
    alert("Please select at least TWO PDF files to merge.");
    return;
  }

  const merged = await PDFLib.PDFDocument.create();

  for (const file of pdfs) {
    const src = await PDFLib.PDFDocument.load(await readFile(file));
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }

  downloadPDF(await merged.save(), "merged.pdf");
}

/* ===============================
   2️⃣ SPLIT PDF (MULTI-RANGE)
================================ */
async function splitPDF() {
  const file = getSinglePDF();
  if (!file) return;

  const rangeStr = document.getElementById("ranges").value.trim();
  if (!rangeStr) {
    alert("Please enter page ranges (e.g. 3-6,10-13)");
    return;
  }

  const src = await PDFLib.PDFDocument.load(await readFile(file));
  const out = await PDFLib.PDFDocument.create();

  const ranges = rangeStr.split(",");

  for (const r of ranges) {
    let [start, end] = r.split("-").map(n => parseInt(n) - 1);
    if (isNaN(start) || isNaN(end)) continue;

    for (let i = start; i <= end; i++) {
      const [page] = await out.copyPages(src, [i]);
      out.addPage(page);
    }
  }

  downloadPDF(await out.save(), "split.pdf");
}

/* ===============================
   3️⃣ DELETE PAGES
================================ */
async function deletePages() {
  const file = getSinglePDF();
  if (!file) return;

  const rangeStr = document.getElementById("ranges").value.trim();
  if (!rangeStr) {
    alert("Please enter page ranges to delete.");
    return;
  }

  const src = await PDFLib.PDFDocument.load(await readFile(file));
  const out = await PDFLib.PDFDocument.create();

  const delSet = new Set();
  rangeStr.split(",").forEach(r => {
    let [s, e] = r.split("-").map(n => parseInt(n) - 1);
    for (let i = s; i <= e; i++) delSet.add(i);
  });

  for (let i = 0; i < src.getPageCount(); i++) {
    if (!delSet.has(i)) {
      const [page] = await out.copyPages(src, [i]);
      out.addPage(page);
    }
  }

  downloadPDF(await out.save(), "deleted_pages.pdf");
}

/* ===============================
   4️⃣ ROTATE / FLIP PDF
================================ */
async function rotatePages() {
  const file = getSinglePDF();
  if (!file) return;

  const option = document.getElementById("rotateOption").value;
  const pdf = await PDFLib.PDFDocument.load(await readFile(file));
  const pages = pdf.getPages();

  pages.forEach(page => {
    const { width, height } = page.getSize();

    if (option === "90") {
      page.setRotation(PDFLib.degrees(90));
    }
    else if (option === "180") {
      page.setRotation(PDFLib.degrees(180));
    }
    else if (option === "270") {
      page.setRotation(PDFLib.degrees(270));
    }
    else if (option === "flipH") {
      page.scale(-1, 1);
      page.translate(width, 0);
    }
    else if (option === "flipV") {
      page.scale(1, -1);
      page.translate(0, height);
    }
  });

  downloadPDF(await pdf.save(), "rotated_flipped.pdf");
}

/* ===============================
   5️⃣ JPG / PNG → PDF
================================ */
async function imagesToPdf() {
  const images = selectedFiles.filter(f => f.type.startsWith("image/"));
  if (images.length === 0) {
    alert("Please select image files (JPG / PNG).");
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  for (let i = 0; i < images.length; i++) {
    const imgData = await toDataURL(images[i]);
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", 10, 10, 190, 270);
  }

  pdf.save("images.pdf");
}

/* ===============================
   IMAGE HELPER
================================ */
function toDataURL(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}
