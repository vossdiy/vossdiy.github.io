import * as pdfjsLib from "../vendor/pdfjs/pdf.mjs";
import { reconstructLines, parseStatement } from "./parser.js";
import { buildCsv, downloadCsv } from "./csv.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "../vendor/pdfjs/pdf.worker.mjs",
  import.meta.url
).href;

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const status = document.getElementById("status");
const resultSection = document.getElementById("result");
const summary = document.getElementById("summary");
const tableBody = document.querySelector("#preview-table tbody");
const downloadBtn = document.getElementById("download-btn");
const errorBox = document.getElementById("error");

let currentTransactions = [];
let currentFilenameBase = "kontoauszug";

function setStatus(text) {
  status.textContent = text;
}

function showError(text) {
  errorBox.textContent = text;
  errorBox.hidden = !text;
}

function resetResult() {
  resultSection.hidden = true;
  tableBody.innerHTML = "";
  currentTransactions = [];
}

async function extractAllLines(pdfDocument) {
  const allLines = [];
  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    allLines.push(...reconstructLines(textContent));
  }
  return allLines;
}

function renderPreview(statementLabel, transactions) {
  summary.textContent = transactions.length
    ? `Kontoauszug Nr. ${statementLabel || "?"}: ${transactions.length} Umsätze erkannt.`
    : `Kontoauszug Nr. ${statementLabel || "?"}: Es wurden keine Umsätze erkannt. Bitte prüfen Sie, ob es sich um einen unterstützten Hanseatic Bank Kreditkarten-Kontoauszug handelt.`;

  tableBody.innerHTML = "";
  for (const tx of transactions) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${tx.buchungsdatum}</td>
      <td>${tx.transaktionsdatum}</td>
      <td>${escapeHtml(tx.beschreibung)}</td>
      <td class="amount ${tx.betrag < 0 ? "neg" : "pos"}">${tx.betrag.toFixed(2).replace(".", ",")}</td>
      <td>${tx.kontoauszugsnr}</td>
    `;
    tableBody.appendChild(tr);
  }

  resultSection.hidden = false;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function handleFile(file) {
  if (!file) return;
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    showError("Bitte wählen Sie eine PDF-Datei aus.");
    return;
  }

  showError("");
  resetResult();
  setStatus("Lese PDF (nur in Ihrem Browser, es wird nichts hochgeladen) …");

  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDocument = await loadingTask.promise;

    const allLines = await extractAllLines(pdfDocument);
    const { statementLabel, transactions } = parseStatement(allLines);

    currentTransactions = transactions;
    currentFilenameBase = statementLabel
      ? `Kontoauszug_${statementLabel.replace("/", "-")}`
      : file.name.replace(/\.pdf$/i, "");

    renderPreview(statementLabel, transactions);
    setStatus("Fertig. Die Datei wurde ausschließlich lokal in diesem Browser verarbeitet.");
  } catch (err) {
    console.error(err);
    showError(
      "Die PDF-Datei konnte nicht gelesen werden. Bitte stellen Sie sicher, dass es sich um einen unveränderten Hanseatic Bank Kreditkarten-Kontoauszug handelt."
    );
    setStatus("");
  }
}

downloadBtn.addEventListener("click", () => {
  if (!currentTransactions.length) return;
  const csv = buildCsv(currentTransactions);
  downloadCsv(csv, `${currentFilenameBase}.csv`);
});

fileInput.addEventListener("change", (e) => {
  handleFile(e.target.files[0]);
});

dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});

["dragenter", "dragover"].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
  });
});

dropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  handleFile(file);
});
