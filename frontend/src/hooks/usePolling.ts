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