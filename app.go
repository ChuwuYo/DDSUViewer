package main

import (
	"context"
	"log"

	"DDSUViewer/internal/graphql"
	"DDSUViewer/internal/service"
)

// App struct
type App struct {
	ctx     context.Context
	service *service.Service
	gqlServer *graphql.Server
}

// NewApp creates a new App application struct
func NewApp() *App {
	svc := service.NewService()
	gqlServer := graphql.NewServer(svc)

	return &App{
		service:   svc,
		gqlServer: gqlServer,
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// 启动GraphQL服务器
	go func() {
		if err := a.gqlServer.Start("8080"); err != nil {
			log.Printf("GraphQL服务器启动失败: %v", err)
		}
	}()
}

// GetAvailablePorts 获取可用串口列表 (Wails方法)
func (a *App) GetAvailablePorts() []string {
	ports, err := a.service.GetAvailablePorts()
	if err != nil {
		log.Printf("获取串口列表失败: %v", err)
		return []string{}
	}
	return ports
}

// StartPolling 启动数据采集 (Wails方法)
func (a *App) StartPolling() bool {
	err := a.service.StartPolling()
	if err != nil {
		log.Printf("启动数据采集失败: %v", err)
		return false
	}
	return true
}

// StopPolling 停止数据采集 (Wails方法)
func (a *App) StopPolling() bool {
	err := a.service.StopPolling()
	if err != nil {
		log.Printf("停止数据采集失败: %v", err)
		return false
	}
	return true
}
