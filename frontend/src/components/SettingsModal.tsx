import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Box, IconButton, Icon, Button } from '@chakra-ui/react';
import { createIcon } from '@chakra-ui/react';
import './SettingsModal.css';
import { SaveSavedSerialConfig, LoadSavedSerialConfig, ClearSavedSerialConfig } from '../../wailsjs/go/main/App';

/**
 * 使用内联 SVG 创建关闭图标（复用用户提供的路径）
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
      } catch {
        /* ignore */
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
        localStorage.removeItem(SAVED_SERIAL_KEY);
        try {
          const defaultConfig = {
            port: '',
            baudRate: 9600,
            dataBits: 8,
            stopBits: 1,
            parity: 'None',
            slaveID: 0,
          };
          localStorage.setItem(CURRENT_SERIAL_KEY, JSON.stringify(defaultConfig));
          // 通知应用立即应用回退的默认配置
          window.dispatchEvent(new CustomEvent('ddsuv_serial_config_restored'));
        } catch (e) {
          console.warn('重置当前串口配置失败', e);
        }
      }
    } catch (e) {
      console.warn('切换保存串口配置失败', e);
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
                    window.alert('没有已保存的串口配置');
                    return;
                  }
                  if (!confirm('将用已保存的配置覆盖当前串口配置？')) return;
                  try {
                    localStorage.setItem(CURRENT_SERIAL_KEY, saved);
                    // 广播恢复事件，SerialConfigPanel 可监听该事件以立即应用
                    window.dispatchEvent(new CustomEvent('ddsuv_serial_config_restored'));
                    window.alert('已恢复保存的串口配置');
                  } catch (e) {
                    console.warn('恢复串口配置失败', e);
                  }
                }}
              >
                恢复
              </Button>
            </div>
          </div>
 
          {children ?? null}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SettingsModal;