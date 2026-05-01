// EmailService.gs - All notification and reminder emails
// Uses GmailApp.sendEmail(). Sender is always the script owner.
// All recipient lookups pull from STAFF DATABASE sheet.

// Returns array of email addresses for staff with the given role (exact match).
// Roles: 'Lab', 'Operator', 'Winemaker', 'Lab Manager', 'Warehouse'
function getStaffByRole(role) {
  var sheet = getSheet('STAFF DATABASE');
  var data = sheet.getDataRange().getValues();
  var emails = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === role && data[i][2]) {
      emails.push(data[i][2]);
    }
  }
  return emails;
}

function _getAllStaffEmails() {
  var sheet = getSheet('STAFF DATABASE');
  var data = sheet.getDataRange().getValues();
  var emails = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][2]) {
      emails.push(data[i][2]);
    }
  }
  return emails;
}

function _getAppUrl() {
  try {
    return ScriptApp.getService().getUrl();
  } catch (e) {
    return '(URL unavailable - deploy as web app)';
  }
}

function _getRunForEmail(runId) {
  var runResult = getRunById(runId);
  if (!runResult.success || !runResult.data) return null;
  return runResult.data;
}

function _formatDateForEmail(isoString) {
  if (!isoString) return '--';
  var d = new Date(isoString);
  if (isNaN(d.getTime())) return String(isoString);
  return d.toDateString();
}

// ---- Notification functions ----

// Triggered when a new run is created.
// Recipients: all staff in STAFF DATABASE.
function sendNewRunNotification(runId) {
  try {
    var run = _getRunForEmail(runId);
    if (!run) return { success: false, error: 'Run not found: ' + runId };
    var appUrl = _getAppUrl();
    var emails = _getAllStaffEmails();
    if (!emails.length) {
      Logger.log('sendNewRunNotification: no staff emails found in STAFF DATABASE');
      return { success: true };
    }
    var subject = 'New Bottling Run Created: ' + runId;
    var body = [
      'A new bottling run has been created.',
      '',
      'Run ID:        ' + run.RUN_ID,
      'Wine:          ' + run.WINE,
      'Vintage:       ' + run.VINTAGE,
      'Bottling Date: ' + _formatDateForEmail(run.BOTTLING_DATE),
      'Winemaker:     ' + run.WINEMAKER,
      '',
      'View run: ' + appUrl
    ].join('\n');
    GmailApp.sendEmail(emails.join(','), subject, body);
    Logger.log('sendNewRunNotification: sent to ' + emails.length + ' recipients for ' + runId);
    return { success: true };
  } catch (e) {
    Logger.log('sendNewRunNotification error for ' + runId + ': ' + e.message);
    return { success: false, error: e.message };
  }
}

// Triggered when Send for Approval is clicked.
// Recipients: Winemaker role + Lab Manager role.
function sendApprovalRequest(runId) {
  try {
    var run = _getRunForEmail(runId);
    if (!run) return { success: false, error: 'Run not found: ' + runId };
    var appUrl = _getAppUrl();
    var wmEmails  = getStaffByRole('Winemaker');
    var lmEmails  = getStaffByRole('Lab Manager');
    var emails    = wmEmails.concat(lmEmails);
    if (!emails.length) {
      Logger.log('sendApprovalRequest: no approver emails found for ' + runId);
      return { success: true };
    }
    var subject = 'Approval Required: ' + runId;
    var body = [
      'A bottling run requires your approval before production can begin.',
      '',
      'Run ID:        ' + run.RUN_ID,
      'Wine:          ' + run.WINE + ' ' + run.VINTAGE,
      'Bottling Date: ' + _formatDateForEmail(run.BOTTLING_DATE),
      'Winemaker:     ' + run.WINEMAKER,
      '',
      'Please log in to approve this run:',
      appUrl,
      '',
      'Winemaker approval and Lab Manager approval are both required.'
    ].join('\n');
    GmailApp.sendEmail(emails.join(','), subject, body);
    Logger.log('sendApprovalRequest: sent to ' + emails.length + ' approvers for ' + runId);
    return { success: true };
  } catch (e) {
    Logger.log('sendApprovalRequest error for ' + runId + ': ' + e.message);
    return { success: false, error: e.message };
  }
}

// Triggered when both approvals received and STATUS flips to Approved.
// Recipients: all Lab role + all Operator role.
function sendApprovalConfirmation(runId) {
  try {
    var run = _getRunForEmail(runId);
    if (!run) return { success: false, error: 'Run not found: ' + runId };
    var appUrl    = _getAppUrl();
    var labEmails = getStaffByRole('Lab');
    var opEmails  = getStaffByRole('Operator');
    var emails    = labEmails.concat(opEmails);
    if (!emails.length) {
      Logger.log('sendApprovalConfirmation: no lab/operator emails found for ' + runId);
      return { success: true };
    }
    var folderLink = (run.FOLDER_LINK && run.FOLDER_LINK !== 'PENDING') ? run.FOLDER_LINK : '(pending)';
    var subject = 'Run Approved - Ready for Production: ' + runId;
    var body = [
      'Bottling run ' + runId + ' has been approved and is ready for production.',
      '',
      'Run ID:        ' + run.RUN_ID,
      'Wine:          ' + run.WINE + ' ' + run.VINTAGE,
      'Bottling Date: ' + _formatDateForEmail(run.BOTTLING_DATE),
      'Winemaker:     ' + run.WINEMAKER,
      'Drive Folder:  ' + folderLink,
      '',
      'View run: ' + appUrl
    ].join('\n');
    GmailApp.sendEmail(emails.join(','), subject, body);
    Logger.log('sendApprovalConfirmation: sent to ' + emails.length + ' recipients for ' + runId);
    return { success: true };
  } catch (e) {
    Logger.log('sendApprovalConfirmation error for ' + runId + ': ' + e.message);
    return { success: false, error: e.message };
  }
}

// Triggered by the hourly time-based trigger.
// Sends two separate emails: one to Lab role, one to Operator role.
function sendHourlyCheckReminder(runId, checkHour, sessionId) {
  try {
    var run = _getRunForEmail(runId);
    if (!run) return { success: false, error: 'Run not found: ' + runId };
    var appUrl    = _getAppUrl();
    var labEmails = getStaffByRole('Lab');
    var opEmails  = getStaffByRole('Operator');

    var labUrl      = appUrl + '?runId=' + runId + '&role=Lab&sessionId='      + sessionId;
    var operatorUrl = appUrl + '?runId=' + runId + '&role=Operator&sessionId=' + sessionId;

    if (labEmails.length) {
      var labSubject = 'Hourly Check Due - Hour ' + checkHour + ': ' + runId;
      var labBody = [
        'Hourly lab check is due for bottling run ' + runId + '.',
        '',
        'Run:         ' + run.WINE + ' ' + run.VINTAGE,
        'Session:     ' + sessionId,
        'Check Hour:  ' + checkHour,
        '',
        'Fields to complete: Lab Checked By, Bottle DO, Bottle DCO2,',
        '  Innotech DO In, Innotech DO Out, Lab Notes',
        '',
        'Submit lab check: ' + labUrl
      ].join('\n');
      GmailApp.sendEmail(labEmails.join(','), labSubject, labBody);
      Logger.log('sendHourlyCheckReminder (Lab): sent for ' + runId + ' hour ' + checkHour);
    } else {
      Logger.log('sendHourlyCheckReminder: no Lab emails found for ' + runId);
    }

    if (opEmails.length) {
      var opSubject = 'Hourly Check Due - Hour ' + checkHour + ': ' + runId;
      var opBody = [
        'Hourly operator check is due for bottling run ' + runId + '.',
        '',
        'Run:         ' + run.WINE + ' ' + run.VINTAGE,
        'Session:     ' + sessionId,
        'Check Hour:  ' + checkHour,
        '',
        'Fields to complete: Checked By, Volume (g), Volume (mL),',
        '  Cap Torque, Velcorin (mL/10), Operator Notes',
        '',
        'Submit operator check: ' + operatorUrl
      ].join('\n');
      GmailApp.sendEmail(opEmails.join(','), opSubject, opBody);
      Logger.log('sendHourlyCheckReminder (Operator): sent for ' + runId + ' hour ' + checkHour);
    } else {
      Logger.log('sendHourlyCheckReminder: no Operator emails found for ' + runId);
    }

    return { success: true };
  } catch (e) {
    Logger.log('sendHourlyCheckReminder error for ' + runId + ': ' + e.message);
    return { success: false, error: e.message };
  }
}

// Triggered when Run Complete is clicked.
// Recipients: Winemaker role + Lab Manager role + all Lab role.
function sendRunCompleteNotification(runId) {
  try {
    var run = _getRunForEmail(runId);
    if (!run) return { success: false, error: 'Run not found: ' + runId };
    var wmEmails  = getStaffByRole('Winemaker');
    var lmEmails  = getStaffByRole('Lab Manager');
    var labEmails = getStaffByRole('Lab');
    var emails    = wmEmails.concat(lmEmails).concat(labEmails);
    if (!emails.length) {
      Logger.log('sendRunCompleteNotification: no recipients found for ' + runId);
      return { success: true };
    }
    var reportLink = (run.REPORT_LINK && run.REPORT_LINK !== 'PENDING') ? run.REPORT_LINK : '(pending)';
    var folderLink = (run.FOLDER_LINK && run.FOLDER_LINK !== 'PENDING') ? run.FOLDER_LINK : '(pending)';
    var subject = 'Bottling Run Complete: ' + runId;
    var body = [
      'Bottling run ' + runId + ' has been completed and archived.',
      '',
      'Run ID:             ' + run.RUN_ID,
      'Wine:               ' + run.WINE + ' ' + run.VINTAGE,
      'Bottling Date:      ' + _formatDateForEmail(run.BOTTLING_DATE),
      'Sessions Completed: ' + (run.NUM_SESSIONS || 0),
      '',
      'Bottling Report: ' + reportLink,
      'Drive Folder:    ' + folderLink
    ].join('\n');
    GmailApp.sendEmail(emails.join(','), subject, body);
    Logger.log('sendRunCompleteNotification: sent to ' + emails.length + ' recipients for ' + runId);
    return { success: true };
  } catch (e) {
    Logger.log('sendRunCompleteNotification error for ' + runId + ': ' + e.message);
    return { success: false, error: e.message };
  }
}
