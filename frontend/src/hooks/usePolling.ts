// frontend/src/hooks/usePolling.ts: 轮询钩子（Hook）。
// 说明：封装对后端 GetElectricalData 的定时请求逻辑，可复用在多个组件中以避免重复实现轮询与清理。
// 目的：如何将定时/副作用逻辑封装为 Hook，确保在组件卸载时正确清理定时器以防内存泄漏。
import { useState, useEffect } from 'react';
import { appStore } from '../store/appStore';

export const useAppStore = () => {
  const [status, setStatus] = useState(appStore.getStatus());
  const [data, setData] = useState(appStore.getData());

  useEffect(() => {
    const unsubscribe = appStore.subscribe(() => {
      setStatus(appStore.getStatus());
      setData(appStore.getData());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { status, data };
};

export const updateStatus = (newStatus: any) => {
  appStore.updateStatus(newStatus);
};