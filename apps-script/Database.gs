// Database.gs - All Sheets read/write operations
// Column indexes are 0-based and must match docs/database-schema.md exactly.

var RUNS_COLUMNS = {
  RUN_ID: 0, WINE: 1, VINTAGE: 2, VINTRACE_ID: 3, TANK_NUMBERS: 4,
  VOLUME: 5, BOTTLING_DATE: 6, NUM_DAYS: 7, WINEMAKER: 8, STATUS: 9,
  WINEMAKER_APPROVED: 10, LAB_APPROVED: 11, WAREHOUSE_APPROVED: 12,
  PRODUCTION_START_TIME: 13, PRODUCTION_END_TIME: 14, NUM_SESSIONS: 15,
  REPORT_LINK: 16, FOLDER_LINK: 17, CREATED_DATE: 18
};

var SESSIONS_COLUMNS = {
  SESSION_ID: 0, RUN_ID: 1, DAY_NUM: 2, START_TIME: 3, END_TIME: 4, STATUS: 5
};

// HOURLY BOT CHECK column indexes (0-based)
var HOURLY_COLUMNS = {
  ENTRY_ID: 0, RUN_ID: 1, CHECKED_BY: 2, LAB_CHECKED_BY: 3, CHECK_HOUR: 4,
  TIMESTAMP: 5, VOLUME_G: 6, VOLUME_ML: 7, BOTTLE_DO: 8, BOTTLE_DCO2: 9,
  INNOTECH_DO_IN: 10, INNOTECH_DO_OUT: 11, CAP_TORQUE: 12, VELCORIN: 13,
  OPERATOR_NOTES: 14, LAB_NOTES: 15
};

// DAY OF BOT CHECK column indexes (0-based)
// SESSION_ID is column B (index 1); all original columns shifted right by 1.
var DOB_COLUMNS = {
  ENTRY_ID: 0, SESSION_ID: 1, RUN_ID: 2, CHECK_DATE: 3, CHECKED_BY: 4, LAB_CHECKED_BY: 5,
  INNOTECH_NIGHT_CLEAN_NUM: 6, INNOTECH_NIGHT_CLEAN_COMPLETED: 7, INNOTECH_NIGHT_CLEAN_DATETIME: 8,
  INNOTECH_MORN_CLEAN_NUM: 9, INNOTECH_MORN_CLEAN_COMPLETED: 10, INNOTECH_MORN_CLEAN_DATETIME: 11,
  INTEGRITY_TEST_DATE: 12, INTEGRITY_TEST_RESULT: 13, VELCORIN: 14,
  LAB_ALC: 15, LAB_DO: 16, LAB_CO2: 17, LAB_FILL_HEIGHT: 18,
  LAB_APPROVED: 19, OPERATOR_APPROVED: 20, PRODUCTION_START: 21,
  OPERATOR_NOTES: 22, LAB_NOTES: 23
};

// --- RUNS: row mapper ---

// Date objects are not serialisable across google.script.run -- convert to ISO strings.
function _serializeDate(val) {
  if (!val || val === '') return '';
  var d = new Date(val);
  return isNaN(d.getTime()) ? String(val) : d.toISOString();
}

function _rowToRun(row) {
  return {
    RUN_ID:                row[RUNS_COLUMNS.RUN_ID],
    WINE:                  row[RUNS_COLUMNS.WINE],
    VINTAGE:               row[RUNS_COLUMNS.VINTAGE],
    VINTRACE_ID:           row[RUNS_COLUMNS.VINTRACE_ID],
    TANK_NUMBERS:          row[RUNS_COLUMNS.TANK_NUMBERS],
    VOLUME:                row[RUNS_COLUMNS.VOLUME],
    BOTTLING_DATE:         _serializeDate(row[RUNS_COLUMNS.BOTTLING_DATE]),
    NUM_DAYS:              row[RUNS_COLUMNS.NUM_DAYS],
    WINEMAKER:             row[RUNS_COLUMNS.WINEMAKER],
    STATUS:                row[RUNS_COLUMNS.STATUS],
    WINEMAKER_APPROVED:    row[RUNS_COLUMNS.WINEMAKER_APPROVED],
    LAB_APPROVED:          row[RUNS_COLUMNS.LAB_APPROVED],
    WAREHOUSE_APPROVED:    row[RUNS_COLUMNS.WAREHOUSE_APPROVED],
    PRODUCTION_START_TIME: _serializeDate(row[RUNS_COLUMNS.PRODUCTION_START_TIME]),
    PRODUCTION_END_TIME:   _serializeDate(row[RUNS_COLUMNS.PRODUCTION_END_TIME]),
    NUM_SESSIONS:          row[RUNS_COLUMNS.NUM_SESSIONS],
    REPORT_LINK:           row[RUNS_COLUMNS.REPORT_LINK],
    FOLDER_LINK:           row[RUNS_COLUMNS.FOLDER_LINK],
    CREATED_DATE:          _serializeDate(row[RUNS_COLUMNS.CREATED_DATE])
  };
}

function _rowToSession(row) {
  return {
    SESSION_ID: row[SESSIONS_COLUMNS.SESSION_ID],
    RUN_ID:     row[SESSIONS_COLUMNS.RUN_ID],
    DAY_NUM:    row[SESSIONS_COLUMNS.DAY_NUM],
    START_TIME: _serializeDate(row[SESSIONS_COLUMNS.START_TIME]),
    END_TIME:   _serializeDate(row[SESSIONS_COLUMNS.END_TIME]),
    STATUS:     row[SESSIONS_COLUMNS.STATUS]
  };
}

// --- RUNS: read ---

function getAllRuns() {
  try {
    var sheet = getSheet('RUNS');
    var data = sheet.getDataRange().getValues();
    var runs = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][RUNS_COLUMNS.RUN_ID]) {
        runs.push(_rowToRun(data[i]));
      }
    }
    var result = { success: true, data: runs };
    Logger.log('getAllRuns returning: ' + JSON.stringify(result));
    return result;
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getRunById(runId) {
  try {
    var sheet = getSheet('RUNS');
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][RUNS_COLUMNS.RUN_ID] === runId) {
        return { success: true, data: _rowToRun(data[i]) };
      }
    }
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getRunsByStatus(status) {
  try {
    var sheet = getSheet('RUNS');
    var data = sheet.getDataRange().getValues();
    var runs = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][RUNS_COLUMNS.RUN_ID] && data[i][RUNS_COLUMNS.STATUS] === status) {
        runs.push(_rowToRun(data[i]));
      }
    }
    return { success: true, data: runs };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// --- RUNS: write ---

// Called as createRunInDb() from RunManager to avoid name collision with RunManager.createRun()
function createRunInDb(runData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet('RUNS');
    var now = new Date();
    var runId = generateRunId(runData.WINE, runData.VINTAGE);
    var row = new Array(19).fill('');
    row[RUNS_COLUMNS.RUN_ID]             = runId;
    row[RUNS_COLUMNS.WINE]               = runData.WINE || '';
    row[RUNS_COLUMNS.VINTAGE]            = runData.VINTAGE || '';
    row[RUNS_COLUMNS.VINTRACE_ID]        = runData.VINTRACE_ID || '';
    row[RUNS_COLUMNS.TANK_NUMBERS]       = runData.TANK_NUMBERS || '';
    row[RUNS_COLUMNS.VOLUME]             = runData.VOLUME || '';
    row[RUNS_COLUMNS.BOTTLING_DATE]      = runData.BOTTLING_DATE || '';
    row[RUNS_COLUMNS.NUM_DAYS]           = runData.NUM_DAYS || '';
    row[RUNS_COLUMNS.WINEMAKER]          = runData.WINEMAKER || '';
    row[RUNS_COLUMNS.STATUS]             = runData.STATUS || 'Active';
    row[RUNS_COLUMNS.WINEMAKER_APPROVED] = 'No';
    row[RUNS_COLUMNS.LAB_APPROVED]       = 'No';
    row[RUNS_COLUMNS.WAREHOUSE_APPROVED] = 'No';
    row[RUNS_COLUMNS.NUM_SESSIONS]       = 0;
    row[RUNS_COLUMNS.CREATED_DATE]       = now;
    sheet.appendRow(row);
    return { success: true, data: _rowToRun(row) };
  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

function updateRunField(runId, fieldName, value) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    if (!(fieldName in RUNS_COLUMNS)) {
      throw new Error('Unknown field name: ' + fieldName);
    }
    var sheet = getSheet('RUNS');
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][RUNS_COLUMNS.RUN_ID] === runId) {
        var col = RUNS_COLUMNS[fieldName] + 1;
        sheet.getRange(i + 1, col).setValue(value);
        return { success: true };
      }
    }
    return { success: false, error: 'Run not found: ' + runId };
  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

function updateRunStatus(runId, status) {
  return updateRunField(runId, 'STATUS', status);
}

// --- PRODUCTION SESSIONS ---

function createSession(runId, dayNumber) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet('PRODUCTION SESSIONS');
    var now = new Date();
    var sessionId = generateSessionId(runId, dayNumber);
    var row = [sessionId, runId, dayNumber, now, '', 'In Production'];
    sheet.appendRow(row);
    return { success: true, data: _rowToSession(row) };
  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

function closeSession(sessionId) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet('PRODUCTION SESSIONS');
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][SESSIONS_COLUMNS.SESSION_ID] === sessionId) {
        var now = new Date();
        sheet.getRange(i + 1, SESSIONS_COLUMNS.END_TIME + 1).setValue(now);
        sheet.getRange(i + 1, SESSIONS_COLUMNS.STATUS + 1).setValue('Completed');
        var runId = data[i][SESSIONS_COLUMNS.RUN_ID];
        var runsSheet = getSheet('RUNS');
        var runsData = runsSheet.getDataRange().getValues();
        for (var j = 1; j < runsData.length; j++) {
          if (runsData[j][RUNS_COLUMNS.RUN_ID] === runId) {
            var current = Number(runsData[j][RUNS_COLUMNS.NUM_SESSIONS]) || 0;
            runsSheet.getRange(j + 1, RUNS_COLUMNS.NUM_SESSIONS + 1).setValue(current + 1);
            break;
          }
        }
        return { success: true };
      }
    }
    return { success: false, error: 'Session not found: ' + sessionId };
  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

function getSessionsByRunId(runId) {
  try {
    var sheet = getSheet('PRODUCTION SESSIONS');
    var data = sheet.getDataRange().getValues();
    var sessions = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][SESSIONS_COLUMNS.RUN_ID] === runId) {
        sessions.push(_rowToSession(data[i]));
      }
    }
    return { success: true, data: sessions };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getActiveSession(runId) {
  try {
    var sheet = getSheet('PRODUCTION SESSIONS');
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][SESSIONS_COLUMNS.RUN_ID] === runId &&
          data[i][SESSIONS_COLUMNS.STATUS] === 'In Production') {
        return { success: true, data: _rowToSession(data[i]) };
      }
    }
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// --- SPLIT-SUBMISSION PATTERN ---
// Each check generates two form links: one for Lab, one for Operator.
// Each form shows only that role's fields. Both submit to the same function,
// which merges data into a single sheet row. First submission creates the row;
// second finds it and fills in the remaining columns via targeted cell writes only
// (never a full row overwrite). LockService prevents race conditions.
// Returns complete:true once both roles' name fields are populated.

function upsertHourlyCheck(runId, checkHour, role, fieldData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet('HOURLY BOT CHECK');
    var data = sheet.getDataRange().getValues();

    var targetRowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][HOURLY_COLUMNS.RUN_ID] === runId &&
          Number(data[i][HOURLY_COLUMNS.CHECK_HOUR]) === Number(checkHour)) {
        targetRowIndex = i;
        break;
      }
    }

    if (targetRowIndex === -1) {
      var newRow = new Array(16).fill('');
      newRow[HOURLY_COLUMNS.ENTRY_ID]   = generateEntryId('HC');
      newRow[HOURLY_COLUMNS.RUN_ID]     = runId;
      newRow[HOURLY_COLUMNS.CHECK_HOUR] = checkHour;
      newRow[HOURLY_COLUMNS.TIMESTAMP]  = new Date();
      _applyHourlyRoleFields(newRow, role, fieldData);
      sheet.appendRow(newRow);
      return { success: true, complete: false };
    }

    var sheetRow = targetRowIndex + 1;
    _writeHourlyRoleFields(sheet, sheetRow, role, fieldData);

    var updatedData = sheet.getRange(sheetRow, 1, 1, 16).getValues()[0];
    var complete = !!(updatedData[HOURLY_COLUMNS.CHECKED_BY] &&
                      updatedData[HOURLY_COLUMNS.LAB_CHECKED_BY]);
    return { success: true, complete: complete };

  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

// Operator: fill weight/torque fields. Lab: DO/DCO2/Innotech readings.
function _applyHourlyRoleFields(row, role, fieldData) {
  if (role === 'Operator') {
    row[HOURLY_COLUMNS.CHECKED_BY]     = fieldData.CHECKED_BY     || '';
    row[HOURLY_COLUMNS.VOLUME_G]       = fieldData.VOLUME_G       || '';
    row[HOURLY_COLUMNS.VOLUME_ML]      = fieldData.VOLUME_ML      || '';
    row[HOURLY_COLUMNS.CAP_TORQUE]     = fieldData.CAP_TORQUE     || '';
    row[HOURLY_COLUMNS.VELCORIN]       = fieldData.VELCORIN       || '';
    row[HOURLY_COLUMNS.OPERATOR_NOTES] = fieldData.OPERATOR_NOTES || '';
  } else if (role === 'Lab') {
    row[HOURLY_COLUMNS.LAB_CHECKED_BY]  = fieldData.LAB_CHECKED_BY  || '';
    row[HOURLY_COLUMNS.BOTTLE_DO]       = fieldData.BOTTLE_DO       || '';
    row[HOURLY_COLUMNS.BOTTLE_DCO2]     = fieldData.BOTTLE_DCO2     || '';
    row[HOURLY_COLUMNS.INNOTECH_DO_IN]  = fieldData.INNOTECH_DO_IN  || '';
    row[HOURLY_COLUMNS.INNOTECH_DO_OUT] = fieldData.INNOTECH_DO_OUT || '';
    row[HOURLY_COLUMNS.LAB_NOTES]       = fieldData.LAB_NOTES       || '';
  }
}

// Writes role-specific fields directly to the sheet (second submission path).
// Field assignment matches _applyHourlyRoleFields above.
function _writeHourlyRoleFields(sheet, sheetRow, role, fieldData) {
  if (role === 'Operator') {
    sheet.getRange(sheetRow, HOURLY_COLUMNS.CHECKED_BY + 1)    .setValue(fieldData.CHECKED_BY     || '');
    sheet.getRange(sheetRow, HOURLY_COLUMNS.VOLUME_G + 1)      .setValue(fieldData.VOLUME_G       || '');
    sheet.getRange(sheetRow, HOURLY_COLUMNS.VOLUME_ML + 1)     .setValue(fieldData.VOLUME_ML      || '');
    sheet.getRange(sheetRow, HOURLY_COLUMNS.CAP_TORQUE + 1)    .setValue(fieldData.CAP_TORQUE     || '');
    sheet.getRange(sheetRow, HOURLY_COLUMNS.VELCORIN + 1)      .setValue(fieldData.VELCORIN       || '');
    sheet.getRange(sheetRow, HOURLY_COLUMNS.OPERATOR_NOTES + 1).setValue(fieldData.OPERATOR_NOTES || '');
  } else if (role === 'Lab') {
    sheet.getRange(sheetRow, HOURLY_COLUMNS.LAB_CHECKED_BY + 1) .setValue(fieldData.LAB_CHECKED_BY  || '');
    sheet.getRange(sheetRow, HOURLY_COLUMNS.BOTTLE_DO + 1)      .setValue(fieldData.BOTTLE_DO       || '');
    sheet.getRange(sheetRow, HOURLY_COLUMNS.BOTTLE_DCO2 + 1)    .setValue(fieldData.BOTTLE_DCO2     || '');
    sheet.getRange(sheetRow, HOURLY_COLUMNS.INNOTECH_DO_IN + 1) .setValue(fieldData.INNOTECH_DO_IN  || '');
    sheet.getRange(sheetRow, HOURLY_COLUMNS.INNOTECH_DO_OUT + 1).setValue(fieldData.INNOTECH_DO_OUT || '');
    sheet.getRange(sheetRow, HOURLY_COLUMNS.LAB_NOTES + 1)      .setValue(fieldData.LAB_NOTES       || '');
  }
}

// --- SPLIT-SUBMISSION: DAY OF BOT CHECK ---
// Lookup key is RUN ID + SESSION ID (column B, added to schema).
// sessionId is generated by generateSessionId(runId, dayNumber) e.g. 'BigWhite2025-Day1'.

function upsertDayOfBotCheck(runId, sessionId, role, fieldData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet('DAY OF BOT CHECK');
    var data = sheet.getDataRange().getValues();

    var targetRowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][DOB_COLUMNS.RUN_ID] === runId &&
          data[i][DOB_COLUMNS.SESSION_ID] === sessionId) {
        targetRowIndex = i;
        break;
      }
    }

    if (targetRowIndex === -1) {
      var newRow = new Array(24).fill('');
      newRow[DOB_COLUMNS.ENTRY_ID]   = generateEntryId('DOB');
      newRow[DOB_COLUMNS.SESSION_ID] = sessionId;
      newRow[DOB_COLUMNS.RUN_ID]     = runId;
      newRow[DOB_COLUMNS.CHECK_DATE] = new Date();
      _applyDobRoleFields(newRow, role, fieldData);
      sheet.appendRow(newRow);
      return { success: true, complete: false };
    }

    var sheetRow = targetRowIndex + 1;
    _writeDobRoleFields(sheet, sheetRow, role, fieldData);

    var updatedData = sheet.getRange(sheetRow, 1, 1, 24).getValues()[0];
    var complete = !!(updatedData[DOB_COLUMNS.CHECKED_BY] &&
                      updatedData[DOB_COLUMNS.LAB_CHECKED_BY]);
    return { success: true, complete: complete };

  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

function _applyDobRoleFields(row, role, fieldData) {
  if (role === 'Operator') {
    row[DOB_COLUMNS.CHECKED_BY]                     = fieldData.CHECKED_BY                     || '';
    row[DOB_COLUMNS.INNOTECH_NIGHT_CLEAN_NUM]       = fieldData.INNOTECH_NIGHT_CLEAN_NUM       || '';
    row[DOB_COLUMNS.INNOTECH_NIGHT_CLEAN_COMPLETED] = fieldData.INNOTECH_NIGHT_CLEAN_COMPLETED || '';
    row[DOB_COLUMNS.INNOTECH_NIGHT_CLEAN_DATETIME]  = fieldData.INNOTECH_NIGHT_CLEAN_DATETIME  || '';
    row[DOB_COLUMNS.INNOTECH_MORN_CLEAN_NUM]        = fieldData.INNOTECH_MORN_CLEAN_NUM        || '';
    row[DOB_COLUMNS.INNOTECH_MORN_CLEAN_COMPLETED]  = fieldData.INNOTECH_MORN_CLEAN_COMPLETED  || '';
    row[DOB_COLUMNS.INNOTECH_MORN_CLEAN_DATETIME]   = fieldData.INNOTECH_MORN_CLEAN_DATETIME   || '';
    row[DOB_COLUMNS.OPERATOR_APPROVED]              = fieldData.OPERATOR_APPROVED              || '';
    row[DOB_COLUMNS.OPERATOR_NOTES]                 = fieldData.OPERATOR_NOTES                 || '';
  } else if (role === 'Lab') {
    row[DOB_COLUMNS.LAB_CHECKED_BY]        = fieldData.LAB_CHECKED_BY        || '';
    row[DOB_COLUMNS.INTEGRITY_TEST_DATE]   = fieldData.INTEGRITY_TEST_DATE   || '';
    row[DOB_COLUMNS.INTEGRITY_TEST_RESULT] = fieldData.INTEGRITY_TEST_RESULT || '';
    row[DOB_COLUMNS.VELCORIN]              = fieldData.VELCORIN              || '';
    row[DOB_COLUMNS.LAB_ALC]               = fieldData.LAB_ALC               || '';
    row[DOB_COLUMNS.LAB_DO]                = fieldData.LAB_DO                || '';
    row[DOB_COLUMNS.LAB_CO2]               = fieldData.LAB_CO2               || '';
    row[DOB_COLUMNS.LAB_FILL_HEIGHT]       = fieldData.LAB_FILL_HEIGHT       || '';
    row[DOB_COLUMNS.LAB_APPROVED]          = fieldData.LAB_APPROVED          || '';
    row[DOB_COLUMNS.LAB_NOTES]             = fieldData.LAB_NOTES             || '';
  }
}

function _writeDobRoleFields(sheet, sheetRow, role, fieldData) {
  if (role === 'Operator') {
    sheet.getRange(sheetRow, DOB_COLUMNS.CHECKED_BY + 1)                    .setValue(fieldData.CHECKED_BY                     || '');
    sheet.getRange(sheetRow, DOB_COLUMNS.INNOTECH_NIGHT_CLEAN_NUM + 1)      .setValue(fieldData.INNOTECH_NIGHT_CLEAN_NUM       || '');
    sheet.getRange(sheetRow, DOB_COLUMNS.INNOTECH_NIGHT_CLEAN_COMPLETED + 1).setValue(fieldData.INNOTECH_NIGHT_CLEAN_COMPLETED || '');
    sheet.getRange(sheetRow, DOB_COLUMNS.INNOTECH_NIGHT_CLEAN_DATETIME + 1) .setValue(fieldData.INNOTECH_NIGHT_CLEAN_DATETIME  || '');
    sheet.getRange(sheetRow, DOB_COLUMNS.INNOTECH_MORN_CLEAN_NUM + 1)       .setValue(fieldData.INNOTECH_MORN_CLEAN_NUM        || '');
    sheet.getRange(sheetRow, DOB_COLUMNS.INNOTECH_MORN_CLEAN_COMPLETED + 1) .setValue(fieldData.INNOTECH_MORN_CLEAN_COMPLETED  || '');
    sheet.getRange(sheetRow, DOB_COLUMNS.INNOTECH_MORN_CLEAN_DATETIME + 1)  .setValue(fieldData.INNOTECH_MORN_CLEAN_DATETIME   || '');
    sheet.getRange(sheetRow, DOB_COLUMNS.OPERATOR_APPROVED + 1)             .setValue(fieldData.OPERATOR_APPROVED              || '');
    sheet.getRange(sheetRow, DOB_COLUMNS.OPERATOR_NOTES + 1)                .setValue(fieldData.OPERATOR_NOTES                 || '');
  } else if (role === 'Lab') {
    sheet.getRange(sheetRow, DOB_COLUMNS.LAB_CHECKED_BY + 1)      .setValue(fieldData.LAB_CHECKED_BY       || '');
    sheet.getRange(sheetRow, DOB_COLUMNS.INTEGRITY_TEST_DATE + 1)  .setValue(fieldData.INTEGRITY_TEST_DATE  || '');
    sheet.getRange(sheetRow, DOB_COLUMNS.INTEGRITY_TEST_RESULT + 1).setValue(fieldData.INTEGRITY_TEST_RESULT|| '');
    sheet.getRange(sheetRow, DOB_COLUMNS.VELCORIN + 1)             .setValue(fieldData.VELCORIN             || '');
    sheet.getRange(sheetRow, DOB_COLUMNS.LAB_ALC + 1)              .setValue(fieldData.LAB_ALC              || '');
    sheet.getRange(sheetRow, DOB_COLUMNS.LAB_DO + 1)               .setValue(fieldData.LAB_DO               || '');
    sheet.getRange(sheetRow, DOB_COLUMNS.LAB_CO2 + 1)              .setValue(fieldData.LAB_CO2              || '');
    sheet.getRange(sheetRow, DOB_COLUMNS.LAB_FILL_HEIGHT + 1)      .setValue(fieldData.LAB_FILL_HEIGHT      || '');
    sheet.getRange(sheetRow, DOB_COLUMNS.LAB_APPROVED + 1)         .setValue(fieldData.LAB_APPROVED         || '');
    sheet.getRange(sheetRow, DOB_COLUMNS.LAB_NOTES + 1)            .setValue(fieldData.LAB_NOTES            || '');
  }
}

// --- Generic append helper ---

// Appends a single row (ordered array) to any named sheet.
// Used by Code.gs server functions for one-off check sheet writes.
function appendToSheet(sheetName, rowData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet(sheetName);
    sheet.appendRow(rowData);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

// --- Row-read helpers for report sync after complete upserts ---

// Returns raw row array for a DAY OF BOT CHECK row identified by runId + sessionId.
function _getDobRow(runId, sessionId) {
  try {
    var sheet = getSheet('DAY OF BOT CHECK');
    var data  = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][DOB_COLUMNS.RUN_ID] === runId &&
          data[i][DOB_COLUMNS.SESSION_ID] === sessionId) {
        return data[i];
      }
    }
    return null;
  } catch (e) {
    Logger.log('_getDobRow error: ' + e.message);
    return null;
  }
}

// Returns raw row array for an HOURLY BOT CHECK row identified by runId + checkHour.
function _getHourlyRow(runId, checkHour) {
  try {
    var sheet = getSheet('HOURLY BOT CHECK');
    var data  = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][HOURLY_COLUMNS.RUN_ID] === runId &&
          Number(data[i][HOURLY_COLUMNS.CHECK_HOUR]) === Number(checkHour)) {
        return data[i];
      }
    }
    return null;
  } catch (e) {
    Logger.log('_getHourlyRow error: ' + e.message);
    return null;
  }
}
