$file = 'src/components/Canvas/DesignCanvas.tsx'
$lines = Get-Content $file

# Remove the dead preview block (lines 333-360)
$remove = 333..360

$keep = @()
for ($i = 0; $i -lt $lines.Length; $i++) {
    $lineNo = $i + 1
    if ($remove -contains $lineNo) {
        continue
    }
    $keep += $lines[$i]
}

Set-Content $file -Value $keep -Encoding UTF8
Write-Output "Original: $($lines.Length) lines, New: $($keep.Length) lines"