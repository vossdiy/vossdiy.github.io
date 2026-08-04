// Parser für Hanseatic Bank Kreditkarten-Kontoauszüge (PDF -> strukturierte Umsätze).
// Arbeitet ausschließlich auf Text, der bereits clientseitig aus dem PDF extrahiert wurde.

const TX_HEADER_RE =
  /^(\d{2}\.\d{2}\.\d{4})\s+(\d{2}\.\d{2}\.\d{4}|-)\s+(Kartenumsatz|Gutschrift)\b/i;
const AMOUNT_LINE_RE =
  /^(?:(-|\d{4})\s+)?(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*€?\s*$/;
const FOREX_LINE_RE = /^-?\d+[.,]\d{2}\s+[A-Z]{3}\s+-?\d+[.,]\d{2}\s+EUR$/i;
const EXCHANGE_RATE_RE = /^Umrechnungskurs:?/i;
const CONTROL_LINE_RE = /^(Alter Saldo|Neuer Saldo|Übertrag Saldo)/i;
const STATEMENT_RE = /Kontoauszug\s+Nr\.?\s*(\d+)\s*\/\s*(\d{4})/i;

/**
 * Wandelt einen deutsch formatierten Betrag ("1.533,83" oder "-26,99") in eine Zahl um.
 */
function parseGermanAmount(str) {
  const normalized = str.replace(/\./g, "").replace(",", ".");
  return parseFloat(normalized);
}

/**
 * Formatiert eine Zahl wieder als deutschen Betrag mit Komma als Dezimaltrennzeichen.
 */
export function formatGermanAmount(value) {
  return value.toFixed(2).replace(".", ",");
}

/**
 * Rekonstruiert Textzeilen aus den von pdf.js gelieferten Textfragmenten einer Seite.
 * pdf.js markiert Zeilenenden über `item.hasEOL`. Zwischen zwei Fragmenten auf derselben
 * Zeile wird ein Leerzeichen eingefügt, wenn der horizontale Abstand deutlich größer ist
 * als die üblichen Zeichenabstände (z. B. Spaltentrenner in der Umsatztabelle).
 */
export function reconstructLines(textContent) {
  const lines = [];
  let parts = [];
  let prev = null;

  for (const item of textContent.items) {
    const str = (item.str || "").replace(/−/g, "-");

    if (prev && str !== "") {
      const prevEndX = prev.transform[4] + prev.width;
      const curX = item.transform[4];
      const gap = curX - prevEndX;
      const fontSize = Math.hypot(item.transform[2], item.transform[3]) || 10;
      if (gap > fontSize * 0.15) {
        parts.push(" ");
      }
    }

    parts.push(str);
    if (str !== "") prev = item;

    if (item.hasEOL) {
      const line = parts.join("").replace(/\s+/g, " ").trim();
      if (line) lines.push(line);
      parts = [];
      prev = null;
    }
  }

  const rest = parts.join("").replace(/\s+/g, " ").trim();
  if (rest) lines.push(rest);

  return lines;
}

/**
 * Parst alle Zeilen eines Kontoauszugs (über alle Seiten hinweg, in Lesereihenfolge)
 * zu einer Liste strukturierter Umsätze.
 *
 * @param {string[]} allLines
 * @returns {{ statementLabel: string, transactions: Array<object> }}
 */
export function parseStatement(allLines) {
  const fullText = allLines.join("\n");
  const stmtMatch = fullText.match(STATEMENT_RE);
  const statementLabel = stmtMatch ? `${stmtMatch[1]}/${stmtMatch[2]}` : "";

  const transactions = [];
  let state = null;

  for (const rawLine of allLines) {
    const line = rawLine.trim();
    if (!line) continue;

    const headerMatch = line.match(TX_HEADER_RE);
    if (headerMatch) {
      // Eine neue Umsatzzeile beginnt. Eine evtl. noch offene, nie abgeschlossene
      // vorherige Transaktion (keine erkannte Betragszeile) wird verworfen.
      state = {
        buchungsdatum: headerMatch[1],
        transaktionsdatum: headerMatch[2] === "-" ? "-" : headerMatch[2],
        descLines: [],
      };
      continue;
    }

    if (!state) continue;

    if (CONTROL_LINE_RE.test(line)) {
      state = null;
      continue;
    }

    const amountMatch = line.match(AMOUNT_LINE_RE);
    if (amountMatch) {
      const betrag = parseGermanAmount(amountMatch[2]);
      transactions.push({
        buchungsdatum: state.buchungsdatum,
        transaktionsdatum: state.transaktionsdatum,
        beschreibung: state.descLines.join(" ").replace(/\s+/g, " ").trim(),
        betrag,
        kontoauszugsnr: statementLabel,
      });
      state = null;
      continue;
    }

    if (FOREX_LINE_RE.test(line) || EXCHANGE_RATE_RE.test(line)) {
      continue;
    }

    state.descLines.push(line);
  }

  return { statementLabel, transactions };
}
