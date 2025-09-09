package graphql

import (
	"context"
	"log"
	"net/http"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gorilla/websocket"

	"DDSUViewer/internal/service"
)

// Server GraphQL服务器
type Server struct {
	service *service.Service
	handler *handler.Server
}

// NewServer 创建GraphQL服务器
func NewServer(svc *service.Service) *Server {
	resolver := NewResolver(svc)
	
	srv := handler.New(NewExecutableSchema(Config{
		Resolvers: resolver,
	}))

	// 配置传输
	srv.AddTransport(transport.POST{})
	srv.AddTransport(transport.GET{})
	srv.AddTransport(transport.Websocket{
		Upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // 允许所有来源
			},
		},
	})

	// 配置扩展
	srv.Use(extension.Introspection{})

	return &Server{
		service: svc,
		handler: srv,
	}
}

// Start 启动GraphQL服务器
func (s *Server) Start(port string) error {
	http.Handle("/", playground.Handler("GraphQL playground", "/query"))
	http.Handle("/query", s.handler)

	log.Printf("GraphQL服务器启动在 http://localhost:%s/", port)
	log.Printf("GraphQL Playground: http://localhost:%s/", port)
	
	return http.ListenAndServe(":"+port, nil)
}

// Shutdown 关闭服务器
func (s *Server) Shutdown(ctx context.Context) error {
	// 这里可以添加优雅关闭逻辑
	return nil
}