function testTemplateCopy() {
  var templateId = PropertiesService.getScriptProperties().getProperty('TEMPLATE_FILE_ID');
  var folderId = PropertiesService.getScriptProperties().getProperty('ACTIVE_RUNS_FOLDER_ID');
  Logger.log('Template ID: ' + templateId);
  Logger.log('Folder ID: ' + folderId);
  try {
    var template = DriveApp.getFileById(templateId);
    Logger.log('Template found: ' + template.getName());
    var folder = DriveApp.getFolderById(folderId);
    Logger.log('Folder found: ' + folder.getName());
    var copy = template.makeCopy('TEST COPY', folder);
    Logger.log('Copy created: ' + copy.getId());
    copy.setTrashed(true);
    Logger.log('Test passed - template copy works');
  } catch(e) {
    Logger.log('Error: ' + e.toString());
  }
}