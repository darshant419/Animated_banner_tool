$c = Get-Content 'src/components/Canvas/AnimationHelpers.ts'
Write-Output "Total lines: $($c.Length)"
for ($i = 0; $i -lt $c.Length; $i++) {
    if ($c[$i] -match '^export const|^export interface|^const [A-Za-z]') {
        Write-Output "L$($i+1): $($c[$i])"
    }
}
Write-Output '--- Imports ---'
$c | Select-Object -First 5