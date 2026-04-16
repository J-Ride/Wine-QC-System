# Wine QC System

## What This Is
A Google Apps Script web app for wine bottling quality control at Frind Estate Winery.
All code is Google Apps Script (.gs files) pushed via clasp.
The database is Google Sheets (Bottling Master Database).
File storage and report generation use Google Drive.

## Tech Constraints
- All server-side code must be valid Google Apps Script (V8 runtime)
- No npm packages — only built-in Apps Script services (SpreadsheetApp, DriveApp, GmailApp, HtmlService, etc.)
- Web app UI is served via HtmlService (HTML/CSS/JS returned from doGet())
- clasp is used for local development — never edit directly in the Apps Script editor
- Timezone is America/Vancouver

## Key Files
- apps-script/Code.gs — main entry point, doGet(), URL routing
- apps-script/Config.gs — PropertiesService setup, constants
- apps-script/Database.gs — all Sheets read/write operations
- apps-script/RunManager.gs — run creation, status transitions, validation
- apps-script/ApprovalService.gs — approval workflow logic
- apps-script/DriveManager.gs — folder creation, report copying, archiving
- apps-script/EmailService.gs — all notification and reminder emails
- apps-script/HourlyTriggers.gs — installable trigger creation/deletion
- apps-script/ReportService.gs — populating Bottling Report tabs from DB
- apps-script/Utils.gs — date formatting, ID generation, helpers
- apps-script/html/ — all client-side HTML, CSS, JS templates

## Database Sheets (in Bottling Master Database Google Sheet)
RUNS, LAB PRE BOT, WAREHOUSE, DAY BEFORE CHECK, DAY OF BOT CHECK, HOURLY BOT CHECK, STAFF RUN LOG, STAFF DATABASE

## Status Flow
Active → Pending Approval → Approved → In Production → (back to Approved) → Completed
Multi-day runs loop: Approved → In Production → Approved → In Production → Completed

## Coding Standards
- Always use PropertiesService for config values (spreadsheet IDs, folder IDs, etc.), never hardcode
- Use LockService for concurrent write operations to prevent race conditions
- All database writes must go through functions in Database.gs
- Return JSON from server functions called by client-side JS via google.script.run
- Handle errors with try/catch and return {success: false, error: message} objects
- Use Sessions model for multi-day production (RunID-Day1, RunID-Day2, etc.) — see docs/status-flow.md