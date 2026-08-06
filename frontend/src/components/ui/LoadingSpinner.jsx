/**
 * LoadingSpinner — Reusable loading indicator.
 * Props:
 *   fullScreen: if true, centers the spinner in the full viewport
 *   size: 'sm' | 'md' | 'lg' (default: 'md')
 *   text: optional loading text to display below the spinner
 */
const LoadingSpinner = ({ fullScreen = false, size = 'md', text = '' }) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizeClasses[size]} border-surface-600 border-t-primary-500 rounded-full animate-spin`}
      />
      {text && (
        <p className="text-sm text-surface-400 animate-pulse">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
