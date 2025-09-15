// frontend/src/main.tsx: React 挂载入口。
// 说明：创建并渲染根组件（App），初始化全局提供者（如 Chakra UI、store）。该文件演示前端如何启动与挂载到 DOM。
// 目的：前端应用启动及与 Wails runtime 的初始交互，避免在此处修改渲染逻辑以免破坏启动流程。
import React from 'react'
import { createRoot } from 'react-dom/client'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import App from './App'
import './style.css'

const container = document.getElementById('root')
if (!container) throw new Error('Root container not found')

const root = createRoot(container)

root.render(
  <React.StrictMode>
    <ChakraProvider value={defaultSystem}>
      <App />
    </ChakraProvider>
  </React.StrictMode>
)
