// DriveManager.gs - Drive folder creation, report copying, archiving
// All IDs come from PropertiesService via getConfig() -- never hardcoded.

function createRunFolder(runId) {
  try {
    Logger.log('createRunFolder called for: ' + runId);

    var activeFolderId = getConfig('ACTIVE_RUNS_FOLDER_ID');
    Logger.log('Active runs folder ID: ' + activeFolderId);
    var activeFolder = DriveApp.getFolderById(activeFolderId);

    var runFolder = activeFolder.createFolder(runId);
    Logger.log('Run subfolder created: ' + runFolder.getId());

    runFolder.createFolder('Supporting Documents');

    var templateFileId = getConfig('TEMPLATE_FILE_ID');
    var templateFile = DriveApp.getFileById(templateFileId);
    var reportFile = templateFile.makeCopy(runId + ' - Bottling Report', runFolder);
    Logger.log('Template copied: ' + reportFile.getId());

    var folderLink = runFolder.getUrl();
    var reportLink = reportFile.getUrl();

    updateRunField(runId, 'FOLDER_LINK', folderLink);
    updateRunField(runId, 'REPORT_LINK', reportLink);

    return { success: true, data: { folderLink: folderLink, reportLink: reportLink } };
  } catch (e) {
    Logger.log('createRunFolder error: ' + e.message);
    return { success: false, error: e.message };
  }
}

function populateReportSummary(runId) {
  try {
    var runResult = getRunById(runId);
    if (!runResult.success) return runResult;
    if (!runResult.data) return { success: false, error: 'Run not found: ' + runId };
    var run = runResult.data;

    if (!run.REPORT_LINK || run.REPORT_LINK === '' || run.REPORT_LINK === 'PENDING') {
      return { success: false, error: 'No report link available for run: ' + runId };
    }

    var ss = SpreadsheetApp.openByUrl(run.REPORT_LINK);
    var sheet = ss.getSheetByName('Run Summary');
    if (!sheet) return { success: false, error: 'Run Summary tab not found in report' };

    sheet.getRange('B2').setValue(run.RUN_ID);
    sheet.getRange('B3').setValue(run.WINE);
    sheet.getRange('B4').setValue(run.VINTAGE);
    sheet.getRange('B5').setValue(run.VINTRACE_ID);
    sheet.getRange('B6').setValue(run.TANK_NUMBERS);
    sheet.getRange('B7').setValue(run.VOLUME);
    sheet.getRange('B8').setValue(run.BOTTLING_DATE ? new Date(run.BOTTLING_DATE) : '');
    sheet.getRange('B9').setValue(run.WINEMAKER);
    sheet.getRange('B10').setValue(run.STATUS);
    sheet.getRange('B11').setValue(run.CREATED_DATE ? new Date(run.CREATED_DATE) : '');

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function archiveRunFolder(runId) {
  try {
    var runResult = getRunById(runId);
    if (!runResult.success) return runResult;
    if (!runResult.data) return { success: false, error: 'Run not found: ' + runId };
    var run = runResult.data;

    if (!run.FOLDER_LINK || run.FOLDER_LINK === '' || run.FOLDER_LINK === 'PENDING') {
      Logger.log('archiveRunFolder: no folder link for run ' + runId + ', skipping move');
      return { success: true };
    }

    var folderId = getFolderIdFromUrl(run.FOLDER_LINK);
    var runFolder = DriveApp.getFolderById(folderId);
    var completedFolder = DriveApp.getFolderById(getConfig('COMPLETED_RUNS_FOLDER_ID'));
    runFolder.moveTo(completedFolder);

    populateReportSummary(runId);

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Parses a Drive folder URL and returns the folder ID string.
// Handles: https://drive.google.com/drive/folders/{ID}
//      and https://drive.google.com/drive/u/0/folders/{ID}
function getFolderIdFromUrl(url) {
  var match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (!match) throw new Error('Could not parse folder ID from URL: ' + url);
  return match[1];
}
