import { formatGermanAmount } from "./parser.js";

const COLUMNS = [
  "Buchungsdatum",
  "Transaktionsdatum",
  "Beschreibung",
  "Betrag in €",
  "Kontoauszugsnr.",
];

/**
 * Escaped ein einzelnes CSV-Feld nach RFC 4180 (Trennzeichen: Semikolon).
 */
function escapeField(value) {
  const str = String(value ?? "");
  if (/[";\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Baut den CSV-Text (Semikolon-getrennt, deutsches Zahlenformat) aus den
 * geparsten Transaktionen. Excel-kompatibel dank UTF-8-BOM.
 */
export function buildCsv(transactions) {
  const rows = [COLUMNS.join(";")];
  for (const tx of transactions) {
    rows.push(
      [
        tx.buchungsdatum,
        tx.transaktionsdatum,
        escapeField(tx.beschreibung),
        formatGermanAmount(tx.betrag),
        tx.kontoauszugsnr,
      ]
        .map(escapeField)
        .join(";")
    );
  }
  return "﻿" + rows.join("\r\n") + "\r\n";
}

/**
 * Stößt im Browser den Download der CSV-Datei an. Es wird nichts an einen
 * Server gesendet – die Datei entsteht rein lokal als Blob.
 */
export function downloadCsv(csvText, filename) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
