cd apps-script
clasp push
cd ..
---------------------------------------------------------------------

Get-ChildItem apps-script -Filter *.gs | ForEach-Object {
  $content = Get-Content $_.FullName -Raw
  [System.IO.File]::WriteAllText($_.FullName, $content, [System.Text.UTF8Encoding]::new($false))
}

-----------------------------------------------------------------
Get-ChildItem apps-script -Recurse -Include *.gs, *.html | ForEach-Object {
  $content = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
  [System.IO.File]::WriteAllText($_.FullName, $content, [System.Text.UTF8Encoding]::new($false))
}