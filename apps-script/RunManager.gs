// RunManager.gs - Run lifecycle orchestration: creation, status transitions, validation

function createRun(formData) {
  try {
    var required = ['WINE', 'VINTAGE', 'VINTRACE_ID', 'TANK_NUMBERS', 'VOLUME', 'BOTTLING_DATE', 'NUM_DAYS', 'WINEMAKER'];
    for (var i = 0; i < required.length; i++) {
      if (!formData[required[i]] && formData[required[i]] !== 0) {
        return { success: false, error: 'Missing required field: ' + required[i] };
      }
    }

    var runData = {
      WINE:          formData.WINE,
      VINTAGE:       Number(formData.VINTAGE),
      VINTRACE_ID:   formData.VINTRACE_ID,
      TANK_NUMBERS:  formData.TANK_NUMBERS,
      VOLUME:        Number(formData.VOLUME),
      BOTTLING_DATE: new Date(formData.BOTTLING_DATE),
      NUM_DAYS:      Number(formData.NUM_DAYS),
      WINEMAKER:     formData.WINEMAKER,
      STATUS:        'Active'
    };

    var dbResult = createRunInDb(runData);
    if (!dbResult.success) return dbResult;

    var runId = dbResult.data.RUN_ID;

    // createRunFolder writes FOLDER_LINK and REPORT_LINK to the sheet itself.
    // If it fails, run creation still succeeds -- surface a warning to the client.
    var warning = null;
    var folderResult = createRunFolder(runId);
    if (!folderResult.success) {
      warning = 'Drive folder creation failed: ' + folderResult.error;
      Logger.log('createRun warning for ' + runId + ': ' + warning);
    } else {
      var summaryResult = populateReportSummary(runId);
      if (!summaryResult.success) {
        Logger.log('createRun: report summary population failed for ' + runId + ': ' + summaryResult.error);
      }
    }

    var emailResult = sendNewRunNotification(runId);
    if (!emailResult.success) {
      Logger.log('createRun: new run notification failed for ' + runId + ': ' + emailResult.error);
    }

    var response = { success: true, data: dbResult.data };
    if (warning) response.warning = warning;
    return response;
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function sendForApproval(runId) {
  try {
    var runResult = getRunById(runId);
    if (!runResult.success) return runResult;
    if (!runResult.data) return { success: false, error: 'Run not found: ' + runId };
    if (runResult.data.STATUS !== 'Active') {
      return { success: false, error: 'Run must be Active to send for approval. Current status: ' + runResult.data.STATUS };
    }

    var statusResult = updateRunStatus(runId, 'Pending Approval');
    if (!statusResult.success) return statusResult;

    var emailResult = sendApprovalRequest(runId);
    if (!emailResult.success) {
      Logger.log('sendForApproval: approval request email failed for ' + runId + ': ' + emailResult.error);
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function approveRun(runId, approverRole) {
  try {
    if (approverRole !== 'WINEMAKER' && approverRole !== 'LAB') {
      return { success: false, error: 'approverRole must be WINEMAKER or LAB' };
    }

    var fieldName = approverRole === 'WINEMAKER' ? 'WINEMAKER_APPROVED' : 'LAB_APPROVED';
    var updateResult = updateRunField(runId, fieldName, 'Yes');
    if (!updateResult.success) return updateResult;

    try {
      var summaryResult = populateReportSummary(runId);
      if (!summaryResult.success) Logger.log('approveRun: report summary update failed for ' + runId + ': ' + summaryResult.error);
    } catch (summaryErr) {
      Logger.log('approveRun: report summary threw for ' + runId + ': ' + summaryErr.message);
    }

    var runResult = getRunById(runId);
    if (!runResult.success) return runResult;
    var run = runResult.data;

    var newStatus = run.STATUS;
    if (run.WINEMAKER_APPROVED === 'Yes' && run.LAB_APPROVED === 'Yes') {
      var statusResult = updateRunStatus(runId, 'Approved');
      if (!statusResult.success) return statusResult;
      newStatus = 'Approved';

      var emailResult = sendApprovalConfirmation(runId);
      if (!emailResult.success) {
        Logger.log('approveRun: confirmation email failed for ' + runId + ': ' + emailResult.error);
      }
    }

    return { success: true, data: { newStatus: newStatus } };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function startProduction(runId) {
  try {
    var runResult = getRunById(runId);
    if (!runResult.success) return runResult;
    if (!runResult.data) return { success: false, error: 'Run not found: ' + runId };
    if (runResult.data.STATUS !== 'Approved') {
      return { success: false, error: 'Run must be Approved to start production. Current status: ' + runResult.data.STATUS };
    }

    var sessionsResult = getSessionsByRunId(runId);
    if (!sessionsResult.success) return sessionsResult;
    var dayNumber = sessionsResult.data.length + 1;

    var sessionResult = createSession(runId, dayNumber);
    if (!sessionResult.success) return sessionResult;

    var sessionId = sessionResult.data.SESSION_ID;

    var statusResult = updateRunStatus(runId, 'In Production');
    if (!statusResult.success) return statusResult;

    // Set PRODUCTION_START_TIME on first session only
    if (dayNumber === 1) {
      updateRunField(runId, 'PRODUCTION_START_TIME', new Date());
    }

    var triggerResult = createHourlyTrigger(runId, sessionId);
    if (!triggerResult.success) {
      Logger.log('startProduction: trigger creation failed for ' + runId + ': ' + triggerResult.error);
    }

    return { success: true, data: { sessionId: sessionId } };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function endProduction(runId) {
  try {
    var sessionResult = getActiveSession(runId);
    if (!sessionResult.success) return sessionResult;
    if (!sessionResult.data) return { success: false, error: 'No active production session found for run: ' + runId };

    var sessionId = sessionResult.data.SESSION_ID;

    var closeResult = closeSession(sessionId);
    if (!closeResult.success) return closeResult;

    updateRunField(runId, 'PRODUCTION_END_TIME', new Date());

    // Status returns to Approved so the run can start another production day or be completed.
    // sendApprovalConfirmation is intentionally NOT called here -- approval email only fires
    // when both Winemaker and Lab approve via approveRun(), never on endProduction.
    var statusResult = updateRunStatus(runId, 'Approved');
    if (!statusResult.success) return statusResult;

    var triggerResult = deleteHourlyTrigger(sessionId);
    if (!triggerResult.success) {
      Logger.log('endProduction: trigger deletion failed for ' + sessionId + ': ' + triggerResult.error);
    }

    return { success: true, data: { sessionId: sessionId } };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function completeRun(runId) {
  try {
    var runResult = getRunById(runId);
    if (!runResult.success) return runResult;
    if (!runResult.data) return { success: false, error: 'Run not found: ' + runId };
    if (runResult.data.STATUS !== 'Approved') {
      return { success: false, error: 'Run must be Approved to complete. Current status: ' + runResult.data.STATUS };
    }

    var activeResult = getActiveSession(runId);
    if (!activeResult.success) return activeResult;
    if (activeResult.data) {
      return { success: false, error: 'Cannot complete run: a production session is still open.' };
    }

    var statusResult = updateRunStatus(runId, 'Completed');
    if (!statusResult.success) return statusResult;

    archiveRunFolder(runId);

    var emailResult = sendRunCompleteNotification(runId);
    if (!emailResult.success) {
      Logger.log('completeRun: complete notification email failed for ' + runId + ': ' + emailResult.error);
    }

    return { success: true, data: { runId: runId } };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
