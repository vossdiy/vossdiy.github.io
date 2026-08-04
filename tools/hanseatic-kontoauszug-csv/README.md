# Hanseatic Bank Kontoauszug → CSV

Ein kleines, rein clientseitiges Web-Tool, das PDF-Kreditkarten-Kontoauszüge der
Hanseatic Bank (z. B. GenialCard) in eine CSV-Datei mit den Einzelumsätzen umwandelt.

Ausgegeben werden pro Umsatz: **Buchungsdatum, Transaktionsdatum, Beschreibung,
Betrag in €** und die **Kontoauszugsnr.**

## Datenschutz / DSGVO

Dieses Tool verarbeitet die PDF-Datei **ausschließlich im Browser**:

- Es gibt **keinen Server-Backend-Code**. `index.html` ist eine statische Seite.
- Die PDF-Datei wird **nicht hochgeladen** und **nicht gespeichert** – weder auf einem
  Server noch dauerhaft im Browser (kein localStorage, keine Cookies, keine Datenbank).
- Alle Bibliotheken (u. a. [pdf.js](https://mozilla.github.io/pdf.js/) zum Lesen der
  PDF-Datei) liegen lokal im Repository unter `vendor/`. Es werden zur Laufzeit **keine
  Anfragen an externe Server oder CDNs** ausgelöst.
- Nach dem Schließen oder Neuladen der Seite sind alle verarbeiteten Daten weg.

Damit eignet sich das Tool für ein DSGVO-konformes Angebot: Der Betreiber der Seite
kommt zu keinem Zeitpunkt mit den Kontodaten der Nutzer:innen in Berührung.

## Funktionsweise

1. Nutzer:in wählt den PDF-Kontoauszug aus (Klick oder Drag & Drop).
2. [pdf.js](https://mozilla.github.io/pdf.js/) extrahiert den Text im Browser.
3. Ein Parser (`js/parser.js`) erkennt die Umsatzzeilen im bekannten Hanseatic-Bank-
   Tabellenformat (`Buchungsdatum | Transaktionsdatum | Beschreibung | Karte | Betrag`),
   inklusive Gutschriften und Fremdwährungsumsätzen.
4. Eine Vorschautabelle wird angezeigt; per Klick auf "CSV herunterladen" wird die Datei
   lokal als Blob erzeugt und heruntergeladen (`js/csv.js`).

Das CSV-Format ist Excel-kompatibel (Semikolon-getrennt, deutsches Dezimalkomma,
UTF-8 mit BOM).

## Hinweise zur Erkennung

Der Parser ist auf das aktuelle Kontoauszugsformat der Hanseatic Bank für die
GenialCard/Kreditkarte zugeschnitten (Stand 2026). Ändert die Bank ihr PDF-Layout
grundlegend, kann eine Anpassung von `js/parser.js` nötig werden. Wird eine
Kontoauszugsdatei nicht erkannt, wird eine Fehlermeldung angezeigt – es werden nie
falsche oder erfundene Daten ausgegeben.

## Lokal ausprobieren

Da die Seite ES-Module verwendet, funktioniert ein einfacher Doppelklick auf
`index.html` (file://) in den meisten Browsern nicht (CORS-Beschränkung für
Modul-Importe). Stattdessen die Datei über einen simplen lokalen Webserver öffnen,
zum Beispiel:

```bash
# Python
python3 -m http.server 8123

# Node.js
npx serve -l 8123
```

Anschließend `http://localhost:8123` im Browser öffnen.

(Unter Windows/PowerShell liegt zusätzlich `serve.ps1` bei, ein winziger
Static-File-Server ohne weitere Abhängigkeiten – nur für die lokale Entwicklung
gedacht.)

## Veröffentlichung auf Codeberg

1. Neues Repository auf [Codeberg.org](https://codeberg.org) anlegen.
2. Dieses Verzeichnis pushen:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://codeberg.org/<dein-nutzername>/<repo-name>.git
   git push -u origin main
   ```

3. Codeberg Pages aktivieren (statisches Hosting): entweder einen Branch namens
   `pages` mit dem Seiteninhalt anlegen, oder in den Repo-Einstellungen Codeberg Pages
   einrichten – siehe [Codeberg-Pages-Doku](https://docs.codeberg.org/codeberg-pages/).
   Da diese Seite komplett statisch ist (kein Build-Schritt nötig), reicht es, den
   Inhalt dieses Ordners 1:1 zu veröffentlichen.

## Lizenz

Der eigene Code steht unter der MIT-Lizenz, siehe [LICENSE](LICENSE).
Die mitgelieferte Bibliothek pdf.js (`vendor/pdfjs/`) steht unter der
Apache-2.0-Lizenz von Mozilla, siehe [vendor/pdfjs/LICENSE](vendor/pdfjs/LICENSE).

## Haftungsausschluss

Inoffizielles Tool ohne Verbindung zur Hanseatic Bank GmbH & Co KG. Keine Gewähr für
Vollständigkeit oder Richtigkeit der erkannten Umsätze – bitte die Ausgabe stichprobenartig
mit dem Original-Kontoauszug abgleichen.
