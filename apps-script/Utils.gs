// Utils.gs - ID generation, date formatting, session helpers

function generateRunId(wineName, vintage) {
  var base = wineName.replace(/\s+/g, '') + vintage;
  try {
    var sheet = getSheet('RUNS');
    var data = sheet.getDataRange().getValues();
    var existingIds = {};
    for (var i = 1; i < data.length; i++) {
      var id = data[i][0];
      if (id) existingIds[id] = true;
    }
    if (!existingIds[base]) return base;
    var counter = 2;
    while (existingIds[base + '-' + counter]) {
      counter++;
    }
    return base + '-' + counter;
  } catch (e) {
    return base;
  }
}

function generateEntryId(prefix) {
  var timestamp = new Date().getTime();
  var random = Math.floor(1000 + Math.random() * 9000);
  return prefix + '-' + timestamp + '-' + random;
}

function formatDate(date) {
  var d = new Date(date);
  var day = String(d.getDate()).padStart(2, '0');
  var month = String(d.getMonth() + 1).padStart(2, '0');
  var year = d.getFullYear();
  return day + '/' + month + '/' + year;
}

function formatTimestamp(date) {
  var d = new Date(date);
  var day = String(d.getDate()).padStart(2, '0');
  var month = String(d.getMonth() + 1).padStart(2, '0');
  var year = d.getFullYear();
  var hours = String(d.getHours()).padStart(2, '0');
  var minutes = String(d.getMinutes()).padStart(2, '0');
  return day + '/' + month + '/' + year + ' ' + hours + ':' + minutes;
}

function generateSessionId(runId, dayNumber) {
  return runId + '-Day' + dayNumber;
}
