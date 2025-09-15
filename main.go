// main.go: Wails 应用入口。
// 说明：负责创建并启动 Wails 应用，绑定 App 实例并嵌入前端 dist 作为静态资源。
// 目的：用于项目启动流程与入口逻辑，勿改动启动相关代码以免破坏运行。
package main

import (
	"embed"
	"log"
	"os"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

// Version 应用程序版本号，通过 ldflags 设置： -X main.Version=1.2.3
var Version = "dev"

//go:embed all:frontend/dist
var embeddedAssets embed.FS

func main() {
	// 创建应用实例（NewApp 在 app.go 中定义）
	app := NewApp()

	// 组装 Wails 应用配置，便于排查和单点修改
	appOptions := &options.App{
		Title:  "DDSUViewer",
		Width:  1024,
		Height: 768,
		MinWidth: 512,
		MinHeight: 480,
		AssetServer: &assetserver.Options{
			Assets: embeddedAssets,
		},
		BackgroundColour: &options.RGBA{R: 255, G: 255, B: 255, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{app},
	}

	// 运行应用并在失败时打印日志、以非零状态退出（替换原始 println，便于 CI/日志采集）
	if err := wails.Run(appOptions); err != nil {
		log.Printf("application failed: %v", err)
		os.Exit(1)
	}
}
