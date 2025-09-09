export const showErrorToast = (title: string, description?: string) => {
  alert(`错误: ${title}${description ? ' - ' + description : ''}`);
};

export const showWarningToast = (title: string, description?: string) => {
  alert(`警告: ${title}${description ? ' - ' + description : ''}`);
};

export const showSuccessToast = (title: string, description?: string) => {
  alert(`成功: ${title}${description ? ' - ' + description : ''}`);
};

export const Toaster = () => null;