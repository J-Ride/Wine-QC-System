// SPRINT 4: Replace stubs with real Drive folder creation and template copying
// Requires: ACTIVE_RUNS_FOLDER_ID, COMPLETED_RUNS_FOLDER_ID, TEMPLATE_FOLDER_ID in PropertiesService (already set via setupConfig())

function createRunFolder(runId) {
  try {
    Logger.log('DriveManager.createRunFolder called for runId: ' + runId);
    return { success: true, data: { folderLink: 'PENDING', reportLink: 'PENDING' } };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function archiveRunFolder(runId) {
  try {
    Logger.log('DriveManager.archiveRunFolder called for runId: ' + runId);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
