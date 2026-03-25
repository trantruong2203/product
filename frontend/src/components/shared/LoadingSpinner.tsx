import { HTMLAttributes, forwardRef } from 'react';

interface LoadingSpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'accent';
}

const sizeStyles: Record<string, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-3',
};

const colorStyles: Record<string, string> = {
  primary: 'border-gray-200 border-t-gray-600',
  white: 'border-white/20 border-t-white',
  accent: 'border-accent/20 border-t-accent',
};

const LoadingSpinner = forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className = '', size = 'md', color = 'accent', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          rounded-full animate-spin
          ${sizeStyles[size]}
          ${colorStyles[color]}
          ${className}
        `}
        {...props}
      />
    );
  }
);

LoadingSpinner.displayName = 'LoadingSpinner';

interface LoadingOverlayProps {
  message?: string;
}

export const LoadingOverlay = ({ message }: LoadingOverlayProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" color="accent" />
        {message && (
          <p className="text-gray-600">{message}</p>
        )}
      </div>
    </div>
  );
};

interface LoadingPageProps {
  title?: string;
}

export const LoadingPage = ({ title }: LoadingPageProps) => {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
      <LoadingSpinner size="lg" color="accent" />
      {title && (
        <p className="text-gray-500">{title}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
