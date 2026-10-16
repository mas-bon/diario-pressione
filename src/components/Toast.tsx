import { motion, AnimatePresence } from 'motion/react';

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'error' | 'info';
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function Toast({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 max-w-[92vw] pointer-events-none safe-bottom">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={() => onDismiss(toast.id)}
            className={`pointer-events-auto px-4 py-3 rounded-xl text-sm font-medium shadow-lg backdrop-blur-md flex items-center gap-2 cursor-pointer transition-transform active:scale-95 ${
              toast.type === 'error'
                ? 'bg-rose-900/95 text-rose-100 border border-rose-700/50'
                : toast.type === 'info'
                ? 'bg-[#10242b]/95 text-cyan-200 border border-cyan-800/40'
                : 'bg-[#10242b]/95 text-[#e6f1f0] border border-[#233a41]/60'
            }`}
          >
            <span>{toast.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
