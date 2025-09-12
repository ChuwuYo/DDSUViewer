param (
    [Parameter(Mandatory=$true)]
    [string]$Version
)

# 读取wails.json文件
$wailsJsonPath = "wails.json"
if (-not (Test-Path $wailsJsonPath)) {
    Write-Error "找不到 wails.json 文件"
    exit 1
}

# 读取并解析JSON
$wailsConfig = Get-Content $wailsJsonPath -Raw | ConvertFrom-Json

# 更新版本号
$wailsConfig.info.productVersion = $Version

# 写回JSON文件
$wailsConfig | ConvertTo-Json -Depth 10 | Out-File -FilePath $wailsJsonPath -Encoding utf8

Write-Host "已更新 wails.json 文件，版本号: $Version"

# 读取frontend\package.json文件
$packageJsonPath = "frontend\package.json"
if (Test-Path $packageJsonPath) {
    $packageConfig = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
    $packageConfig.version = $Version
    $packageConfig | ConvertTo-Json -Depth 10 | Out-File -FilePath $packageJsonPath -Encoding utf8
    Write-Host "已更新 frontend\package.json 文件，版本号: $Version"
} else {
    Write-Warning "找不到 frontend\package.json 文件，跳过更新"
}

# 执行标准wails构建命令
$buildCommand = "wails build -ldflags=`"-X main.Version=$Version`""
Write-Host "执行构建命令: $buildCommand"
Invoke-Expression $buildCommand

Write-Host "标准构建完成！"