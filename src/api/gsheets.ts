import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from "google-spreadsheet";
import { JWT } from 'google-auth-library';

/**
 * See https://theoephraim.github.io/node-google-spreadsheet/#/guides/authentication
 * for setup instructions.
 */
export async function loadGoogleSpreadsheet(docId: string): 
  Promise<GoogleSpreadsheet>
{
  console.log("Loading Google Spreadsheet", docId);
  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL!,
    key: process.env.GOOGLE_SHEETS_PRIVATE_KEY!,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  
  const doc = new GoogleSpreadsheet(docId, serviceAccountAuth);
  await doc.loadInfo();
  return doc;
}

/**
 * Each array element represents a worksheet. Each cell can be a value or
 * [cell properties](https://theoephraim.github.io/node-google-spreadsheet/#/classes/google-spreadsheet-cell?id=properties).
 * 
 * Example:
 * 
 *  [{
 *     title: "worksheet1",
 *     cells: [
 *       [1, null, "foo"],
 *       [null, null, null],
 *       [2, 3],
 *     ],
 *   }, {
 *     title: "worksheet2",
 *     cells: [
 *       [{ 
 *         value: 5, 
 *         backgroundColor: { red: 1, green: 0.949, blue: 0.8 }, 
 *         textFormat: { bold: true } 
 *       }]
 *     ],
 *   }]
 */
export type SpreadsheetInputData = {
  title: string;
  cells: any[][];
}[];

export async function updateGoogleSpreadsheet(
  doc: GoogleSpreadsheet,
  data: SpreadsheetInputData,
) {
  for (const worksheet of data) {
    const title = worksheet.title;
    console.log("Updating worksheet", title);
    const sheet = doc.sheetsByTitle[title] ?? await doc.addSheet({ title });
    await updateCells(sheet, worksheet.cells);
    await sheet.saveUpdatedCells();
    // Pause to avoid rate limiting. Default write quota is 300 per min.
    // https://console.cloud.google.com/apis/api/sheets.googleapis.com/quotas
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

async function updateCells(sheet: GoogleSpreadsheetWorksheet, cells: any[][]) {
  const numRows = cells.length;
  const numCols = Math.max(...cells.map(row => row.length));

  // Resize the sheet if necessary
  if (sheet.rowCount < numRows || sheet.columnCount < numCols) {
    await sheet.resize({
      rowCount: Math.max(sheet.rowCount, numRows),
      columnCount: Math.max(sheet.columnCount, numCols),
    });
  }

  await sheet.loadCells();

  for (let r = 0; r < numRows; r++) {
    const row = cells[r];
    for (let c = 0; c < row.length; c++) {
      const v = row[c];
      if (v === null) continue;
      const cell = sheet.getCell(r, c);
      if (typeof v === 'object') {
        for (const k in v) {
          // @ts-expect-error
          cell[k] = v[k];
        }
      } else {
        cell.value = v;
      }
    }
  }
}
