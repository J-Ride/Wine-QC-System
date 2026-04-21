// Code.gs - Web app entry point and server-side function bridge

function doGet(e) {
  return HtmlService.createTemplateFromFile('html/Index')
    .evaluate()
    .setTitle('Wine QC System')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Used by <?!= include('html/RunDetail') ?> in Index.html
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// --- Server functions -- called from client via google.script.run ---

function serverGetAllRuns() {
  try {
    return getAllRuns();
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function serverGetRunById(runId) {
  try {
    return getRunById(runId);
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function serverCreateRun(formData) {
  try {
    return createRun(formData);
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function serverSendForApproval(runId) {
  try {
    return sendForApproval(runId);
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function serverApproveRun(runId, approverRole) {
  try {
    return approveRun(runId, approverRole);
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function serverStartProduction(runId) {
  try {
    return startProduction(runId);
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function serverEndProduction(runId) {
  try {
    return endProduction(runId);
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function serverCompleteRun(runId) {
  try {
    return completeRun(runId);
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function serverPopulateReportSummary(runId) {
  try {
    return populateReportSummary(runId);
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function serverArchiveRunFolder(runId) {
  try {
    return archiveRunFolder(runId);
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function serverGetStaff() {
  try {
    var sheet = getSheet('STAFF DATABASE');
    var data = sheet.getDataRange().getValues();
    var staff = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][0]) {
        staff.push({
          name:       data[i][0],
          role:       data[i][1],
          email:      data[i][2],
          department: data[i][3]
        });
      }
    }
    return { success: true, data: staff };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function serverGetActiveSession(runId) {
  try {
    return getActiveSession(runId);
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// --- Check form submission bridge functions ---

function serverSubmitLabPreBot(runId, formData) {
  try {
    var runResult = getRunById(runId);
    if (!runResult.success || !runResult.data) return { success: false, error: 'Run not found: ' + runId };
    var run = runResult.data;
    var row = [
      generateEntryId('LAB'),
      runId,
      run.WINE,
      run.VINTAGE,
      formData.CHECK_DATE  ? new Date(formData.CHECK_DATE) : new Date(),
      formData.CHECKED_BY  || '',
      formData.TANK_NUMBER || '',
      formData.VOLUME      || '',
      formData.FSO2        || '',
      formData.TSO2        || '',
      formData.ALC         || '',
      formData.PH          || '',
      formData.TA          || '',
      formData.VA          || '',
      formData.RS          || '',
      formData.MALIC       || '',
      formData.DO          || '',
      formData.DCO2        || '',
      formData.ISTC        || '',
      formData.FILT        || '',
      formData.NOTES       || ''
    ];
    var dbResult = appendToSheet('LAB PRE BOT', row);
    if (!dbResult.success) return dbResult;
    var reportResult = appendLabPreBot(runId, formData);
    if (!reportResult.success) Logger.log('serverSubmitLabPreBot: report write failed: ' + reportResult.error);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function serverSubmitWarehouse(runId, formData) {
  try {
    var row = [
      generateEntryId('WH'),
      runId,
      formData.CHECK_DATE          ? new Date(formData.CHECK_DATE) : new Date(),
      formData.CHECKED_BY          || '',
      formData.GLASS_QTY           || '',
      formData.GLASS_MOLD          || '',
      formData.CAP_QTY             || '',
      formData.CAP_INFO            || '',
      formData.LABEL_QTY           || '',
      formData.LABEL_INFO_CONFIRM  || '',
      formData.BOX_TYPE            || '',
      formData.INSERT_TYPE         || '',
      formData.NOTES               || '',
      formData.SIGN_OFF            || ''
    ];
    var dbResult = appendToSheet('WAREHOUSE', row);
    if (!dbResult.success) return dbResult;
    var updateResult = updateRunField(runId, 'WAREHOUSE_APPROVED', 'Yes');
    if (!updateResult.success) return updateResult;
    var reportResult = appendWarehouse(runId, formData);
    if (!reportResult.success) Logger.log('serverSubmitWarehouse: report write failed: ' + reportResult.error);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function serverSubmitDayBefore(runId, formData) {
  try {
    var row = [
      generateEntryId('DB'),
      runId,
      formData.CHECK_DATE         ? new Date(formData.CHECK_DATE) : new Date(),
      formData.CHECKED_BY         || '',
      formData.TANK_NUMBER        || '',
      formData.VOLUME             || '',
      formData.TARGET_FSO2        || '',
      formData.TARGET_TOT_SO2     || '',
      formData.TARGET_DO          || '',
      formData.TARGET_FILT        || '',
      formData.TARGET_TEMP        || '',
      formData.TARGET_PH          || '',
      formData.TARGET_TA          || '',
      formData.TARGET_ALC         || '',
      formData.TARGET_VA          || '',
      formData.FSO2               || '',
      formData.TOT_SO2            || '',
      formData.DO                 || '',
      formData.FILT               || '',
      formData.TEMP               || '',
      formData.PH                 || '',
      formData.TA                 || '',
      formData.ALC                || '',
      formData.VA                 || '',
      formData.HEAT_STABLE        || '',
      formData.COLD_STABLE        || '',
      formData.FREE_SO2_IN_TARGET || '',
      formData.NOTES              || ''
    ];
    var dbResult = appendToSheet('DAY BEFORE CHECK', row);
    if (!dbResult.success) return dbResult;
    var reportResult = appendDayBefore(runId, formData);
    if (!reportResult.success) Logger.log('serverSubmitDayBefore: report write failed: ' + reportResult.error);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function serverSubmitDayOfCheck(runId, sessionId, role, formData) {
  try {
    var upsertResult = upsertDayOfBotCheck(runId, sessionId, role, formData);
    if (!upsertResult.success) return upsertResult;

    if (upsertResult.complete) {
      var row = _getDobRow(runId, sessionId);
      if (row) {
        var operatorData = {
          CHECKED_BY:                     row[DOB_COLUMNS.CHECKED_BY],
          INNOTECH_NIGHT_CLEAN_NUM:       row[DOB_COLUMNS.INNOTECH_NIGHT_CLEAN_NUM],
          INNOTECH_NIGHT_CLEAN_COMPLETED: row[DOB_COLUMNS.INNOTECH_NIGHT_CLEAN_COMPLETED],
          INNOTECH_NIGHT_CLEAN_DATETIME:  row[DOB_COLUMNS.INNOTECH_NIGHT_CLEAN_DATETIME],
          INNOTECH_MORN_CLEAN_NUM:        row[DOB_COLUMNS.INNOTECH_MORN_CLEAN_NUM],
          INNOTECH_MORN_CLEAN_COMPLETED:  row[DOB_COLUMNS.INNOTECH_MORN_CLEAN_COMPLETED],
          INNOTECH_MORN_CLEAN_DATETIME:   row[DOB_COLUMNS.INNOTECH_MORN_CLEAN_DATETIME],
          OPERATOR_APPROVED:              row[DOB_COLUMNS.OPERATOR_APPROVED],
          OPERATOR_NOTES:                 row[DOB_COLUMNS.OPERATOR_NOTES]
        };
        var labData = {
          LAB_CHECKED_BY:        row[DOB_COLUMNS.LAB_CHECKED_BY],
          INTEGRITY_TEST_DATE:   row[DOB_COLUMNS.INTEGRITY_TEST_DATE],
          INTEGRITY_TEST_RESULT: row[DOB_COLUMNS.INTEGRITY_TEST_RESULT],
          VELCORIN:              row[DOB_COLUMNS.VELCORIN],
          LAB_ALC:               row[DOB_COLUMNS.LAB_ALC],
          LAB_DO:                row[DOB_COLUMNS.LAB_DO],
          LAB_CO2:               row[DOB_COLUMNS.LAB_CO2],
          LAB_FILL_HEIGHT:       row[DOB_COLUMNS.LAB_FILL_HEIGHT],
          LAB_APPROVED:          row[DOB_COLUMNS.LAB_APPROVED],
          LAB_NOTES:             row[DOB_COLUMNS.LAB_NOTES]
        };
        var reportResult = appendDayOfBot(runId, sessionId, operatorData, labData);
        if (!reportResult.success) Logger.log('serverSubmitDayOfCheck: report write failed: ' + reportResult.error);
      }
    }
    return { success: true, complete: upsertResult.complete };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function serverSubmitHourlyCheck(runId, sessionId, checkHour, role, formData) {
  try {
    var upsertResult = upsertHourlyCheck(runId, checkHour, role, formData);
    if (!upsertResult.success) return upsertResult;

    if (upsertResult.complete) {
      var row = _getHourlyRow(runId, checkHour);
      if (row) {
        var operatorData = {
          CHECKED_BY:     row[HOURLY_COLUMNS.CHECKED_BY],
          VOLUME_G:       row[HOURLY_COLUMNS.VOLUME_G],
          VOLUME_ML:      row[HOURLY_COLUMNS.VOLUME_ML],
          CAP_TORQUE:     row[HOURLY_COLUMNS.CAP_TORQUE],
          VELCORIN:       row[HOURLY_COLUMNS.VELCORIN],
          OPERATOR_NOTES: row[HOURLY_COLUMNS.OPERATOR_NOTES]
        };
        var labData = {
          LAB_CHECKED_BY:  row[HOURLY_COLUMNS.LAB_CHECKED_BY],
          BOTTLE_DO:       row[HOURLY_COLUMNS.BOTTLE_DO],
          BOTTLE_DCO2:     row[HOURLY_COLUMNS.BOTTLE_DCO2],
          INNOTECH_DO_IN:  row[HOURLY_COLUMNS.INNOTECH_DO_IN],
          INNOTECH_DO_OUT: row[HOURLY_COLUMNS.INNOTECH_DO_OUT],
          LAB_NOTES:       row[HOURLY_COLUMNS.LAB_NOTES]
        };
        var reportResult = appendHourlyCheck(runId, sessionId, checkHour, operatorData, labData);
        if (!reportResult.success) Logger.log('serverSubmitHourlyCheck: report write failed: ' + reportResult.error);
      }
    }
    return { success: true, complete: upsertResult.complete };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function serverSubmitStaffRunLog(runId, formData) {
  try {
    var row = [
      generateEntryId('SRL'),
      runId,
      formData.NAME         || '',
      formData.ROLE         || '',
      formData.HOURS_WORKED || '',
      formData.NOTES        || ''
    ];
    return appendToSheet('STAFF RUN LOG', row);
  } catch (e) {
    return { success: false, error: e.message };
  }
}
