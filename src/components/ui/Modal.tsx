import { ReactNode } from 'react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop - pointer-events-none so it doesn't block the modal */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity pointer-events-none"
      />
      
      {/* Click overlay for closing - sits behind modal content */}
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative flex min-h-full items-center justify-center p-4 pointer-events-none">
        <div 
          className={`relative bg-white rounded-xl shadow-xl w-full ${sizeStyles[size]} max-h-[90vh] overflow-hidden pointer-events-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
          
          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-120px)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
