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

    var folderResult = createRunFolder(runId);
    if (folderResult.success && folderResult.data) {
      if (folderResult.data.folderLink !== 'PENDING') {
        updateRunField(runId, 'FOLDER_LINK', folderResult.data.folderLink);
      }
      if (folderResult.data.reportLink !== 'PENDING') {
        updateRunField(runId, 'REPORT_LINK', folderResult.data.reportLink);
      }
    }

    return { success: true, data: dbResult.data };
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
    return updateRunStatus(runId, 'Pending Approval');
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

    var runResult = getRunById(runId);
    if (!runResult.success) return runResult;
    var run = runResult.data;

    var newStatus = run.STATUS;
    if (run.WINEMAKER_APPROVED === 'Yes' && run.LAB_APPROVED === 'Yes') {
      var statusResult = updateRunStatus(runId, 'Approved');
      if (!statusResult.success) return statusResult;
      newStatus = 'Approved';
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

    var statusResult = updateRunStatus(runId, 'In Production');
    if (!statusResult.success) return statusResult;

    // Set PRODUCTION_START_TIME on first session only
    if (dayNumber === 1) {
      updateRunField(runId, 'PRODUCTION_START_TIME', new Date());
    }

    return { success: true, data: { sessionId: sessionResult.data.SESSION_ID } };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function endProduction(runId) {
  try {
    var sessionResult = getActiveSession(runId);
    if (!sessionResult.success) return sessionResult;
    if (!sessionResult.data) return { success: false, error: 'No active production session found for run: ' + runId };

    var closeResult = closeSession(sessionResult.data.SESSION_ID);
    if (!closeResult.success) return closeResult;

    updateRunField(runId, 'PRODUCTION_END_TIME', new Date());

    var statusResult = updateRunStatus(runId, 'Approved');
    if (!statusResult.success) return statusResult;

    return { success: true, data: { sessionId: sessionResult.data.SESSION_ID } };
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

    return { success: true, data: { runId: runId } };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
