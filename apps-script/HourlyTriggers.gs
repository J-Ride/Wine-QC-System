// HourlyTriggers.gs - Installable trigger creation/deletion for hourly check loop.
// One trigger per active production session, fires every hour.
// Trigger IDs stored in PropertiesService keyed as 'TRIGGER_' + sessionId.

function createHourlyTrigger(runId, sessionId) {
  try {
    var trigger = ScriptApp.newTrigger('runHourlyCheck')
      .timeBased()
      .everyHours(1)
      .create();
    var triggerId = trigger.getUniqueId();
    var props = PropertiesService.getScriptProperties();
    props.setProperty('TRIGGER_' + sessionId, triggerId);
    props.setProperty('TRIGGER_META_' + sessionId, JSON.stringify({
      runId:     runId,
      sessionId: sessionId,
      startTime: new Date().toISOString()
    }));
    Logger.log('createHourlyTrigger: created ' + triggerId + ' for session ' + sessionId + ' run ' + runId);
    return { success: true, data: { triggerId: triggerId } };
  } catch (e) {
    Logger.log('createHourlyTrigger error for ' + sessionId + ': ' + e.message);
    return { success: false, error: e.message };
  }
}

function deleteHourlyTrigger(sessionId) {
  try {
    var props     = PropertiesService.getScriptProperties();
    var triggerId = props.getProperty('TRIGGER_' + sessionId);
    if (!triggerId) {
      Logger.log('deleteHourlyTrigger: no stored trigger ID for session ' + sessionId);
      return { success: true };
    }
    var triggers = ScriptApp.getProjectTriggers();
    var deleted  = false;
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getUniqueId() === triggerId) {
        ScriptApp.deleteTrigger(triggers[i]);
        deleted = true;
        Logger.log('deleteHourlyTrigger: deleted trigger ' + triggerId + ' for session ' + sessionId);
        break;
      }
    }
    if (!deleted) {
      Logger.log('deleteHourlyTrigger: trigger ' + triggerId + ' not found in project triggers (may already be deleted)');
    }
    props.deleteProperty('TRIGGER_' + sessionId);
    props.deleteProperty('TRIGGER_META_' + sessionId);
    return { success: true };
  } catch (e) {
    Logger.log('deleteHourlyTrigger error for ' + sessionId + ': ' + e.message);
    return { success: false, error: e.message };
  }
}

// Safety cleanup: finds any triggers whose session is no longer In Production
// and deletes them. Called at the start of every runHourlyCheck() execution.
function cleanupOrphanedTriggers() {
  try {
    var props    = PropertiesService.getScriptProperties();
    var allProps = props.getProperties();
    var keys     = Object.keys(allProps);
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      if (key.indexOf('TRIGGER_META_') !== 0) continue;
      var sessionId = key.replace('TRIGGER_META_', '');
      var meta;
      try {
        meta = JSON.parse(allProps[key]);
      } catch (parseErr) {
        Logger.log('cleanupOrphanedTriggers: unparseable meta for session ' + sessionId + ', removing');
        deleteHourlyTrigger(sessionId);
        continue;
      }
      var runResult = getRunById(meta.runId);
      if (runResult.success && runResult.data && runResult.data.STATUS === 'In Production') {
        continue;
      }
      Logger.log('cleanupOrphanedTriggers: run ' + meta.runId + ' is no longer In Production, removing trigger for session ' + sessionId);
      deleteHourlyTrigger(sessionId);
    }
  } catch (e) {
    Logger.log('cleanupOrphanedTriggers error: ' + e.message);
  }
}

// Global function called by the time-based trigger every hour.
// Processes all In Production runs and sends hourly check reminder emails.
function runHourlyCheck() {
  Logger.log('runHourlyCheck: starting at ' + new Date().toISOString());
  cleanupOrphanedTriggers();
  try {
    var runsResult = getRunsByStatus('In Production');
    if (!runsResult.success) {
      Logger.log('runHourlyCheck: getRunsByStatus failed: ' + runsResult.error);
      return;
    }
    var runs = runsResult.data;
    Logger.log('runHourlyCheck: ' + runs.length + ' in-production run(s) found');
    for (var i = 0; i < runs.length; i++) {
      var run           = runs[i];
      var sessionResult = getActiveSession(run.RUN_ID);
      if (!sessionResult.success || !sessionResult.data) {
        Logger.log('runHourlyCheck: no active session for run ' + run.RUN_ID + ', skipping');
        continue;
      }
      var session   = sessionResult.data;
      var startTime = new Date(session.START_TIME);
      var now       = new Date();
      var checkHour = Math.floor((now - startTime) / 3600000) + 1;
      Logger.log('runHourlyCheck: processing run ' + run.RUN_ID + ' session ' + session.SESSION_ID + ' hour ' + checkHour);
      var emailResult = sendHourlyCheckReminder(run.RUN_ID, checkHour, session.SESSION_ID);
      if (!emailResult.success) {
        Logger.log('runHourlyCheck: email failed for ' + run.RUN_ID + ': ' + emailResult.error);
      }
    }
    Logger.log('runHourlyCheck: done');
  } catch (e) {
    Logger.log('runHourlyCheck error: ' + e.message);
  }
}
