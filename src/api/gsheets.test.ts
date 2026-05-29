import { expect } from "chai";
import sinon from "sinon";

describe("gsheets", () => {
  let gsheetsModule: any;
  let mockDoc: any;
  let mockSheet: any;
  let clock: sinon.SinonFakeTimers;

  before(async () => {
    // We cannot easily mock the ES module dependency of google-spreadsheet using
    // td.replace and import in mocha ts-node if the type of package isn't properly configured.
    // However, the module gsheets.ts only exports two functions.
    // And it doesn't do top-level evaluation of `google-spreadsheet`.
    // Let's see if we can import it and mock `updateCells` directly or mock the inputs properly.
    gsheetsModule = await import("./gsheets" + ".ts");
  });

  beforeEach(() => {
    clock = sinon.useFakeTimers();

    // Mock sheet methods and properties
    mockSheet = {
      rowCount: 2,
      columnCount: 2,
      resize: sinon.stub().resolves(),
      loadCells: sinon.stub().resolves(),
      getCell: sinon.stub().returns({ value: null }),
      saveUpdatedCells: sinon.stub().resolves(),
    };

    // Mock doc methods and properties
    mockDoc = {
      sheetsByTitle: {
        existingSheet: mockSheet,
      },
      addSheet: sinon.stub().resolves(mockSheet),
    };
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  describe("updateGoogleSpreadsheet", () => {
    it("should update an existing sheet", async () => {
      const data = [
        {
          title: "existingSheet",
          cells: [
            [1, 2],
            [3, 4],
          ],
        },
      ];

      const updatePromise = gsheetsModule.updateGoogleSpreadsheet(
        mockDoc,
        data,
      );
      await clock.tickAsync(500); // Advance timer to let sleep resolve
      await updatePromise;

      expect(mockDoc.addSheet.callCount).to.equal(0);
      expect(mockSheet.loadCells.callCount).to.equal(1);
      expect(mockSheet.getCell.callCount).to.equal(4);
      expect(mockSheet.saveUpdatedCells.callCount).to.equal(1);
      expect(mockSheet.resize.callCount).to.equal(0);
    });

    it("should add a new sheet if it does not exist", async () => {
      const data = [
        {
          title: "newSheet",
          cells: [[1]],
        },
      ];

      const updatePromise = gsheetsModule.updateGoogleSpreadsheet(
        mockDoc,
        data,
      );
      await clock.tickAsync(500); // Advance timer to let sleep resolve
      await updatePromise;

      expect(mockDoc.addSheet.callCount).to.equal(1);
      expect(mockDoc.addSheet.firstCall.args[0]).to.deep.equal({
        title: "newSheet",
      });
      expect(mockSheet.loadCells.callCount).to.equal(1);
      expect(mockSheet.getCell.callCount).to.equal(1);
      expect(mockSheet.saveUpdatedCells.callCount).to.equal(1);
    });

    it("should resize sheet if required", async () => {
      const data = [
        {
          title: "existingSheet",
          cells: [
            [1, 2, 3], // 3 cols
            [4, 5, 6],
            [7, 8, 9], // 3 rows
          ],
        },
      ];

      const updatePromise = gsheetsModule.updateGoogleSpreadsheet(
        mockDoc,
        data,
      );
      await clock.tickAsync(500);
      await updatePromise;

      expect(mockSheet.resize.callCount).to.equal(1);
      expect(mockSheet.resize.firstCall.args[0]).to.deep.equal({
        rowCount: 3,
        columnCount: 3,
      });
    });

    it("should correctly handle object values with properties", async () => {
      const cellObj = { value: "test", textFormat: { bold: true } };
      const data = [
        {
          title: "existingSheet",
          cells: [[cellObj]],
        },
      ];
      const mockCell: any = {};
      mockSheet.getCell.returns(mockCell);

      const updatePromise = gsheetsModule.updateGoogleSpreadsheet(
        mockDoc,
        data,
      );
      await clock.tickAsync(500);
      await updatePromise;

      expect(mockCell.value).to.equal("test");
      expect(mockCell.textFormat).to.deep.equal({ bold: true });
    });

    it("should skip null values", async () => {
      const data = [
        {
          title: "existingSheet",
          cells: [[null, null, 1]],
        },
      ];

      const updatePromise = gsheetsModule.updateGoogleSpreadsheet(
        mockDoc,
        data,
      );
      await clock.tickAsync(500);
      await updatePromise;

      expect(mockSheet.getCell.callCount).to.equal(1); // Only for the '1'
    });
  });
});
