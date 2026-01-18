import type { ReadingStatusType } from '../../shared/types';

interface StatusBadgeProps {
  status: ReadingStatusType;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';
  
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  const statusStyles = {
    unread: 'bg-gray-100 text-gray-700',
    reading: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
  };

  const statusLabels = {
    unread: '📖 Unread',
    reading: '📚 Reading',
    completed: '✅ Completed',
  };

  return (
    <span className={`${baseStyles} ${sizeStyles[size]} ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}
