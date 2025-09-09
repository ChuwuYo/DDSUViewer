import React from 'react';
import { createToaster } from '@chakra-ui/react';

const toaster = createToaster({
  placement: 'top-right',
});

export const showSuccessToast = (title: string, description?: string) => {
  toaster.create({
    title,
    description,
    status: 'success',
    duration: 3000,
  });
};

export const showErrorToast = (title: string, description?: string) => {
  toaster.create({
    title,
    description,
    status: 'error',
    duration: 5000,
  });
};

export const showWarningToast = (title: string, description?: string) => {
  toaster.create({
    title,
    description,
    status: 'warning',
    duration: 4000,
  });
};

export const Toaster = toaster.Toaster;