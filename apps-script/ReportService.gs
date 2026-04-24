// ReportService.gs - Writes submitted check data into Bottling Report tabs

// Opens the Bottling Report spreadsheet for a run. Throws on any problem.
function _openReport(runId) {
  var runResult = getRunById(runId);
  if (!runResult.success) throw new Error(runResult.error);
  if (!runResult.data) throw new Error('Run not found: ' + runId);
  var run = runResult.data;
  if (!run.REPORT_LINK || run.REPORT_LINK === '' || run.REPORT_LINK === 'PENDING') {
    throw new Error('No report link available for run: ' + runId + '. Create the run folder first.');
  }
  return SpreadsheetApp.openByUrl(run.REPORT_LINK);
}

function appendLabPreBot(runId, data) {
  try {
    var ss = _openReport(runId);
    var sheet = ss.getSheetByName('Lab Pre-Bot');
    if (!sheet) return { success: false, error: 'Tab "Lab Pre-Bot" not found in report' };
    var runResult = getRunById(runId);
    var run = runResult.data;
    sheet.appendRow([
      generateEntryId('LAB'),
      runId,
      run.WINE,
      run.VINTAGE,
      data.CHECK_DATE  || new Date(),
      data.CHECKED_BY  || '',
      data.TANK_NUMBER || '',
      data.VOLUME      || '',
      data.FSO2        || '',
      data.TSO2        || '',
      data.ALC         || '',
      data.PH          || '',
      data.TA          || '',
      data.VA          || '',
      data.RS          || '',
      data.MALIC       || '',
      data.DO          || '',
      data.DCO2        || '',
      data.ISTC        || '',
      data.FILT        || '',
      data.NOTES       || ''
    ]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function appendWarehouse(runId, data) {
  try {
    var ss = _openReport(runId);
    var sheet = ss.getSheetByName('Warehouse');
    if (!sheet) return { success: false, error: 'Tab "Warehouse" not found in report' };
    sheet.appendRow([
      generateEntryId('WH'),
      runId,
      data.CHECK_DATE          || new Date(),
      data.CHECKED_BY          || '',
      data.GLASS_QTY           || '',
      data.GLASS_MOLD          || '',
      data.CAP_QTY             || '',
      data.CAP_INFO            || '',
      data.LABEL_QTY           || '',
      data.LABEL_INFO_CONFIRM  || '',
      data.BOX_TYPE            || '',
      data.INSERT_TYPE         || '',
      data.NOTES               || '',
      data.SIGN_OFF            || ''
    ]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function appendDayBefore(runId, data) {
  try {
    var ss = _openReport(runId);
    var sheet = ss.getSheetByName('Day Before Checks');
    if (!sheet) return { success: false, error: 'Tab "Day Before Checks" not found in report' };
    sheet.appendRow([
      generateEntryId('DB'),
      runId,
      data.CHECK_DATE          || new Date(),
      data.CHECKED_BY          || '',
      data.TANK_NUMBER         || '',
      data.VOLUME              || '',
      data.TARGET_FSO2         || '',
      data.TARGET_TOT_SO2      || '',
      data.TARGET_DO           || '',
      data.TARGET_FILT         || '',
      data.TARGET_TEMP         || '',
      data.TARGET_PH           || '',
      data.TARGET_TA           || '',
      data.TARGET_ALC          || '',
      data.TARGET_VA           || '',
      data.FSO2                || '',
      data.TOT_SO2             || '',
      data.DO                  || '',
      data.FILT                || '',
      data.TEMP                || '',
      data.PH                  || '',
      data.TA                  || '',
      data.ALC                 || '',
      data.VA                  || '',
      data.HEAT_STABLE         || '',
      data.COLD_STABLE         || '',
      data.FREE_SO2_IN_TARGET  || '',
      data.NOTES               || ''
    ]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function appendDayOfBot(runId, sessionId, operatorData, labData) {
  try {
    var ss = _openReport(runId);
    var sheet = ss.getSheetByName('Day of Bot Checks');
    if (!sheet) return { success: false, error: 'Tab "Day of Bot Checks" not found in report' };
    sheet.appendRow([
      generateEntryId('DOB'),
      runId,
      sessionId,
      new Date(),
      operatorData.CHECKED_BY                     || '',
      labData.LAB_CHECKED_BY                      || '',
      operatorData.INNOTECH_NIGHT_CLEAN_NUM        || '',
      operatorData.INNOTECH_NIGHT_CLEAN_COMPLETED  || '',
      operatorData.INNOTECH_NIGHT_CLEAN_DATETIME   || '',
      operatorData.INNOTECH_MORN_CLEAN_NUM         || '',
      operatorData.INNOTECH_MORN_CLEAN_COMPLETED   || '',
      operatorData.INNOTECH_MORN_CLEAN_DATETIME    || '',
      operatorData.INTEGRITY_TEST_DATE             || '',
      operatorData.INTEGRITY_TEST_RESULT           || '',
      operatorData.VELCORIN                        || '',
      labData.LAB_ALC                              || '',
      labData.LAB_DO                               || '',
      labData.LAB_CO2                              || '',
      labData.LAB_FILL_HEIGHT                      || '',
      labData.LAB_APPROVED                         || '',
      operatorData.OPERATOR_APPROVED               || '',
      operatorData.OPERATOR_NOTES                  || '',
      labData.LAB_NOTES                            || ''
    ]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function appendHourlyCheck(runId, sessionId, checkHour, operatorData, labData) {
  try {
    var ss = _openReport(runId);
    var sheet = ss.getSheetByName('Hourly Checks');
    if (!sheet) return { success: false, error: 'Tab "Hourly Checks" not found in report' };
    sheet.appendRow([
      generateEntryId('HC'),
      runId,
      sessionId,
      operatorData.CHECKED_BY      || '',
      labData.LAB_CHECKED_BY       || '',
      checkHour,
      new Date(),
      labData.VOLUME_G             || '',
      labData.VOLUME_ML            || '',
      labData.BOTTLE_DO            || '',
      labData.BOTTLE_DCO2          || '',
      operatorData.INNOTECH_DO_IN  || '',
      operatorData.INNOTECH_DO_OUT || '',
      operatorData.CAP_TORQUE      || '',
      operatorData.VELCORIN        || '',
      operatorData.OPERATOR_NOTES  || '',
      labData.LAB_NOTES            || ''
    ]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function appendStaffRunLog(runId, entryId, row) {
  try {
    var ss = _openReport(runId);
    var sheet = ss.getSheetByName('Staff Run Log');
    if (!sheet) return { success: false, error: 'Tab "Staff Run Log" not found in report' };
    sheet.appendRow([
      entryId,
      runId,
      row.NAME         || '',
      row.ROLE         || '',
      row.HOURS_WORKED || '',
      row.NOTES        || ''
    ]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function appendProductionSession(runId, sessionData) {
  try {
    var ss = _openReport(runId);
    var sheet = ss.getSheetByName('Production Sessions');
    if (!sheet) return { success: false, error: 'Tab "Production Sessions" not found in report' };
    sheet.appendRow([
      sessionData.SESSION_ID || '',
      runId,
      sessionData.DAY_NUM    || '',
      sessionData.START_TIME || '',
      sessionData.END_TIME   || '',
      sessionData.STATUS     || ''
    ]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
