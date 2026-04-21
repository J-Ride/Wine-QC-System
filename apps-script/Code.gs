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
