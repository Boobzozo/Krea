import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'loading' | null;

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  if (!type) return null;

  const variants = {
    success: {
      bg: 'bg-sage/10',
      border: 'border-sage',
      text: 'text-sage',
      icon: <CheckCircle2 size={20} />,
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-400',
      text: 'text-red-600',
      icon: <AlertCircle size={20} />,
    },
    loading: {
      bg: 'bg-gold/10',
      border: 'border-gold',
      text: 'text-gold',
      icon: <RefreshCw size={20} className="animate-spin" />,
    },
  };

  const active = variants[type];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 100, y: 0 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, x: 100, y: 0 }}
        className="fixed bottom-6 right-6 z-[9999] w-full max-w-sm sm:w-auto sm:min-w-[320px] px-4 sm:px-0"
      >
        <div 
          className={`flex items-center gap-4 p-4 rounded-2xl border shadow-2xl ${active.bg} ${active.border} ${active.text} backdrop-blur-md`}
        >
          <div className="flex-shrink-0">
            {active.icon}
          </div>
          
          <div className="flex-1 font-sans text-sm font-medium">
            {message}
          </div>

          <button 
            onClick={onClose}
            className="flex-shrink-0 p-1 hover:bg-black/5 rounded-full transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Toast;
