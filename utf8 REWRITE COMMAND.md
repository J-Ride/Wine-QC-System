Get-ChildItem apps-script -Filter *.gs | ForEach-Object {
  $content = Get-Content $_.FullName -Raw
  [System.IO.File]::WriteAllText($_.FullName, $content, [System.Text.UTF8Encoding]::new($false))
}