// 简化的toast实现
export const toaster = {
  success: ({ title, description }: { title: string; description?: string }) => {
    alert(`✅ ${title}${description ? '\n' + description : ''}`);
  },
  error: ({ title, description }: { title: string; description?: string }) => {
    alert(`❌ ${title}${description ? '\n' + description : ''}`);
  },
  warning: ({ title, description }: { title: string; description?: string }) => {
    alert(`⚠️ ${title}${description ? '\n' + description : ''}`);
  },
};

// 兼容旧的 showToast API: showToast.success(title, description)
export const showToast = {
  success: (title: string, description?: string) => toaster.success({ title, description }),
  error: (title: string, description?: string) => toaster.error({ title, description }),
  warning: (title: string, description?: string) => toaster.warning({ title, description }),
};

export const Toaster = () => null;