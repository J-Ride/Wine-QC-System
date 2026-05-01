// Config.gs PropertiesService setup and spreadsheet access

function setupConfig() {
  var props = PropertiesService.getScriptProperties();
  props.setProperties({
    SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE',
    ACTIVE_RUNS_FOLDER_ID: 'YOUR_ACTIVE_RUNS_FOLDER_ID_HERE',
    COMPLETED_RUNS_FOLDER_ID: 'YOUR_COMPLETED_RUNS_FOLDER_ID_HERE',
    TEMPLATE_FOLDER_ID: 'YOUR_TEMPLATE_FOLDER_ID_HERE',
    TEMPLATE_FILE_ID: 'YOUR_TEMPLATE_FILE_ID_HERE'
  });
}

function getConfig(key) {
  var value = PropertiesService.getScriptProperties().getProperty(key);
  if (value === null || value === undefined) {
    throw new Error('Missing required config key: ' + key + '. Run setupConfig() first.');
  }
  return value;
}

function getSpreadsheet() {
  return SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
}

function getSheet(sheetName) {
  var sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }
  return sheet;
}
