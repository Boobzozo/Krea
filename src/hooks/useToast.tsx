import { useState, useCallback, useRef } from 'react';
import Toast, { ToastType } from '../components/admin/Toast';

export const useToast = () => {
  const [message, setMessage] = useState<string>('');
  const [type, setType] = useState<ToastType>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const hide = useCallback(() => {
    setType(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const showSuccess = useCallback((msg: string) => {
    hide();
    setMessage(msg);
    setType('success');
    timeoutRef.current = setTimeout(() => {
      hide();
    }, 3000);
  }, [hide]);

  const showError = useCallback((msg: string) => {
    hide();
    setMessage(msg);
    setType('error');
  }, [hide]);

  const showLoading = useCallback((msg: string) => {
    hide();
    setMessage(msg);
    setType('loading');
  }, [hide]);

  return {
    showSuccess,
    showError,
    showLoading,
    hide,
    ToastComponent: type ? (
      <Toast message={message} type={type} onClose={hide} />
    ) : null,
  };
};
