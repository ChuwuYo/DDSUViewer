import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  Box,
  IconButton,
  Icon,
  Button,
} from '@chakra-ui/react';
import { createIcon } from '@chakra-ui/react';
import './SettingsModal.css';
import { SaveSavedSerialConfig, LoadSavedSerialConfig, ClearSavedSerialConfig } from '../../wailsjs/go/main/App';

/**
 * 使用内联 SVG 创建关闭图标
 */
export const CloseXIcon = createIcon({
  displayName: 'CloseXIcon',
  viewBox: '-49 141 512 512',
  path: (
    <>
      <path d="m242.355 397 127.987-127.987c9.763-9.763 9.763-25.592 0-35.355s-25.592-9.763-35.355 0L207 361.644 79.013 233.658c-9.764-9.763-25.592-9.763-35.355 0s-9.763 25.592 0 35.355l127.986 127.986L43.658 524.986c-9.763 9.763-9.763 25.592 0 35.355s25.592 9.763 35.355 0l127.986-127.986 127.987 127.987c9.764 9.763 25.592 9.763 35.355 0s9.763-25.592 0-35.355z" />
    </>
  ),
});

/**
 * SettingsModal（自实现版本，避免对 Chakra Modal 类型的依赖）
 * - 使用 createPortal 渲染到 body
 * - 遮罩支持 backdrop-filter: blur(...)，并降级为半透明遮罩
 * - 使用 Chakra 的 IconButton（children 形式）保持与项目中 IconButton 的一致用法
 */
export const SettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}> = ({ isOpen, onClose, children }) => {
  // 使用 CSS 变量回退到项目色值，避免依赖不存在的 useTheme 导出
  const surface = 'var(--md-surface, #ffffff)';
  const onSurface = 'var(--md-on-surface, #111827)';
  const overlayBg = 'var(--md-backdrop, rgba(0,0,0,0.28))';
  const elevation = '0 10px 30px rgba(0,0,0,0.12)';

  const contentRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const [animateIn, setAnimateIn] = useState(false);

  // 设置：是否保存当前串口配置到备份（localStorage）
  const CURRENT_SERIAL_KEY = 'ddsuv_serial_config_v1';
  const SAVED_SERIAL_KEY = 'ddsuv_serial_config_saved_v1';
  const [saveSerialChecked, setSaveSerialChecked] = useState<boolean>(false);
  // 内置简单 toast 实现，兼容项目中自定义浮层风格
  const [toastState, setToastState] = useState<{ title?: string; description?: string; status?: 'success' | 'error' | 'warning' } | null>(null);
  const showToast = (title?: string, description?: string, status: 'success' | 'error' | 'warning' = 'success') => {
    setToastState({ title, description, status });
    window.setTimeout(() => setToastState(null), 4000);
  };
  const [restorePending, setRestorePending] = useState<string>('');
  const [isRestoreOpen, setIsRestoreOpen] = useState<boolean>(false);
  const restoreCancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const t = window.setTimeout(() => {
      setAnimateIn(true);
      closeBtnRef.current?.focus();
    }, 10);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const container = contentRef.current;
        if (!container) return;
        const focusable = Array.from(
          container.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length);
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === first || active === contentRef.current) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKeyDown);
      try {
        previouslyFocusedRef.current?.focus();
      } catch (e) {
        console.warn('SettingsModal: 无法恢复之前聚焦元素', e);
      }
      setAnimateIn(false);
    };
  }, [isOpen, onClose]);

  // 初始化复选框状态（根据是否存在已保存的快照），优先询问后端并回退到 localStorage
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const backend = await LoadSavedSerialConfig();
        if (!cancelled && backend && backend !== '') {
          setSaveSerialChecked(true);
          return;
        }
      } catch {
        // 后端可能不可用，回退到 localStorage
      }
      try {
        const exists = Boolean(localStorage.getItem(SAVED_SERIAL_KEY));
        if (!cancelled) setSaveSerialChecked(exists);
      } catch {
        // ignore storage errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // 处理用户切换“保存当前的串口配置”开关：会调用后端 RPC，并同时维护 localStorage 作为回退
  const handleSaveToggle = async (next: boolean) => {
    setSaveSerialChecked(next);
    try {
      if (next) {
        const currentRaw = localStorage.getItem(CURRENT_SERIAL_KEY) || '';
        // 默认值，保证所有字段存在且类型稳健
        let parsed: any = {
          port: '',
          baudRate: 9600,
          dataBits: 8,
          stopBits: 1,
          parity: 'None',
          slaveID: 0,
        };
        if (currentRaw) {
          try {
            const p = JSON.parse(currentRaw);
            parsed = { ...parsed, ...p };
          } catch {
            // 解析失败则使用默认值
          }
        }
        try {
          // 校验当前配置是否有效：避免在没有实际配置时保存“空白/默认(0)”从站地址
          const hasPort = Boolean(parsed.port && String(parsed.port).trim() !== '');
          const hasSlave = Number(parsed.slaveID) > 0;
          if (!hasPort && !hasSlave) {
            // 恢复复选框状态并提示用户先设置串口/从站地址
            setSaveSerialChecked(false);
            showToast('无法保存配置', '当前没有可保存的串口配置。请先在串口面板中选择端口并设置从站地址，然后再启用保存。', 'warning');
            return;
          }

          // 按照 Wails 生成的绑定签名，传入 6 个参数
          await SaveSavedSerialConfig(
            parsed.port || '',
            Number(parsed.baudRate || 9600),
            Number(parsed.dataBits || 8),
            Number(parsed.stopBits || 1),
            parsed.parity || 'None',
            Number(parsed.slaveID || 0)
          );
          // 后端成功或抛出前，我们都在 localStorage 中写入 JSON 字符串作为回退
          localStorage.setItem(SAVED_SERIAL_KEY, JSON.stringify(parsed));
        } catch (e) {
          // 后端保存失败时仍使用 localStorage 作为回退
          localStorage.setItem(SAVED_SERIAL_KEY, JSON.stringify(parsed));
        }
      } else {
        // 取消保存：尝试清理后端并移除本地备份
        try {
          await ClearSavedSerialConfig();
        } catch {
          // ignore backend clear errors
        }
        // 移除已保存的快照（用于下一次启动时不再加载）
        localStorage.removeItem(SAVED_SERIAL_KEY);
        // 为确保：1) 关闭“保存”后，当前运行时配置不应立即改变；
        // 2) 但在下一次重启时不再加载之前的持久化配置，
        // 我们在此仅清理本地的持久化 CURRENT_SERIAL_KEY，而不修改内存中的当前配置或触发恢复广播。
        try {
          localStorage.removeItem(CURRENT_SERIAL_KEY);
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      console.warn('切换保存串口配置失败', e);
    }
  };
  
  const handleConfirmRestore = async () => {
    const saved = restorePending;
    setIsRestoreOpen(false);
    setRestorePending('');
    try {
      // 解析已保存内容，兼容后端返回对象或字符串
      let parsed: any = null;
      try {
        parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
      } catch {
        parsed = null;
      }
      // 校验：仅当包含有效端口或有效从站地址 (>0) 时才写入 CURRENT_SERIAL_KEY
      const hasPort = parsed && parsed.port && String(parsed.port).trim() !== '';
      const hasSlave = parsed && parsed.slaveID !== undefined && Number(parsed.slaveID) > 0;
      if (!hasPort && !hasSlave) {
        showToast('恢复取消', '已保存的配置不包含有效端口或从站地址，恢复已取消。', 'warning');
        try { localStorage.removeItem(CURRENT_SERIAL_KEY); } catch { /* ignore */ }
        return;
      }
      // 写入并广播（统一以 JSON 字符串保存 CURRENT_SERIAL_KEY）
      localStorage.setItem(CURRENT_SERIAL_KEY, JSON.stringify(parsed));
      window.dispatchEvent(new CustomEvent('ddsuv_serial_config_restored'));
      showToast('已恢复', '已恢复保存的串口配置', 'success');
    } catch (e) {
      console.warn('恢复串口配置失败', e);
      showToast('错误', '恢复串口配置失败', 'error');
    }
  };
  
  if (!isOpen) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: overlayBg,
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    zIndex: 1400,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    transition: 'opacity 180ms ease',
    opacity: animateIn ? 1 : 0,
  };

  const contentStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '720px',
    borderRadius: 12,
    background: surface,
    color: onSurface,
    boxShadow: elevation,
    position: 'relative',
    maxHeight: '90vh',
    overflowY: 'auto',
    transform: animateIn ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.98)',
    opacity: animateIn ? 1 : 0,
    transition: 'opacity 180ms ease, transform 180ms ease',
  };

  const headerStyle: React.CSSProperties = {
    padding: '20px 20px 12px 20px',
    fontSize: '18px',
    fontWeight: 700,
    color: onSurface,
  };

  const bodyStyle: React.CSSProperties = {
    padding: '0 20px 20px 20px',
  };

  const footerStyle: React.CSSProperties = {
    padding: '12px 20px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  };

  return ReactDOM.createPortal(
    <div
      style={overlayStyle}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-hidden={!isOpen}
    >
      {/* 内置 toast 浮层（简化版） */}
      {toastState && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 1600 }}>
          <div style={{ background: toastState.status === 'success' ? '#38a169' : toastState.status === 'error' ? '#c53030' : '#dd6b20', color: 'white', padding: '12px 16px', borderRadius: 6, boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: 360 }}>
            {toastState.title && <div style={{ fontWeight: 600 }}>{toastState.title}</div>}
            {toastState.description && <div style={{ marginTop: 6, fontSize: 13 }}>{toastState.description}</div>}
          </div>
        </div>
      )}
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        style={contentStyle}
      >
        <IconButton
          ref={closeBtnRef}
          aria-label="Close settings"
          children={<Icon as={CloseXIcon} w="16px" h="16px" />}
          variant="ghost"
          colorScheme="gray"
          size="sm"
          onClick={onClose}
          style={{ position: 'absolute', top: 12, right: 12 }}
        />
        <div id="settings-modal-title" style={headerStyle}>
          设置
        </div>
        <div style={bodyStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
            {/* Switch styles moved to frontend/src/components/SettingsModal.css */}
 
            <label className="switch" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={saveSerialChecked}
                onChange={(e) => {
                  const next = e.target.checked;
                  void handleSaveToggle(next);
                }}
                aria-label="保存当前的串口配置"
              />
              <span className="slider" />
            </label>
 
            <span>保存当前的串口配置</span>
 
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  let saved = '';
                  try {
                    const backend = await LoadSavedSerialConfig();
                    if (backend && backend !== '') {
                      // 后端可能返回 JSON 字符串或对象，统一为 JSON 字符串
                      if (typeof backend === 'string') {
                        saved = backend;
                      } else {
                        try {
                          saved = JSON.stringify(backend);
                        } catch {
                          // ignore stringify errors
                        }
                      }
                    }
                  } catch {
                    // ignore backend errors
                  }
                  if (!saved) saved = localStorage.getItem(SAVED_SERIAL_KEY) || '';
                  if (!saved) {
                    showToast('未找到保存的配置', '没有已保存的串口配置', 'warning');
                    return;
                  }
                  // 打开确认对话框，由用户确认后再执行恢复
                  setRestorePending(saved);
                  setIsRestoreOpen(true);
                }}
              >
                恢复
              </Button>
            </div>
          </div>
 
          {children ?? null}
          {isRestoreOpen && (
            <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500 }}>
              <div style={{ background: 'white', padding: 20, borderRadius: 8, width: 'min(480px, 90%)', boxShadow: '0 8px 24px rgba(0,0,0,0.16)' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: 8 }}>确认恢复</div>
                <div style={{ marginBottom: 16 }}>将用已保存的配置覆盖当前串口配置？</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <Button ref={restoreCancelRef} onClick={() => setIsRestoreOpen(false)}>取消</Button>
                  <Button colorScheme="blue" onClick={handleConfirmRestore}>确认</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SettingsModal;