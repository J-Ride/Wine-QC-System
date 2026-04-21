// Config.gs PropertiesService setup and spreadsheet access

function setupConfig() {
  var props = PropertiesService.getScriptProperties();
  props.setProperties({
    SPREADSHEET_ID: '1tkUADcQono8rcHK2INgej-1xLCw-yB-8Rdhh53o2PHk',
    ACTIVE_RUNS_FOLDER_ID: '1ZalPd7BGFa8sBhkwyTJSJ9yCcbxjMnyd',
    COMPLETED_RUNS_FOLDER_ID: '1KeV4gokid2eFFXHqIBetOs6-KWtIzIJI',
    TEMPLATE_FOLDER_ID: '1ewvus630X-SsDkgUmSqQUkUFy-6oRhNs',
    TEMPLATE_FILE_ID: '1VOewzqh1yhDkFg9YnLJcbR7f9ReGDh611SQ3aH4M4LA'    
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
