import { createToaster } from '@chakra-ui/react';

const toaster = createToaster({
  placement: 'top',
  pauseOnPageIdle: true,
});

export const showErrorToast = (title: string, description?: string) => {
  toaster.create({
    title,
    description,
    status: 'error',
    duration: 5000,
    isClosable: true,
  });
};

export const showWarningToast = (title: string, description?: string) => {
  toaster.create({
    title,
    description,
    status: 'warning',
    duration: 4000,
    isClosable: true,
  });
};

export const showSuccessToast = (title: string, description?: string) => {
  toaster.create({
    title,
    description,
    status: 'success',
    duration: 3000,
    isClosable: true,
  });
};

export { toaster };