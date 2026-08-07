import React from 'react';
import { Package } from 'lucide-react';

const EmptyState = ({
  icon: Icon = Package,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      {/* Icon Container */}
      <div className="w-20 h-20 rounded-2xl bg-[#84A98C]/10 flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-[#84A98C]" />
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-[#1E293B] mb-2">{title}</h3>

      {/* Description */}
      <p className="text-[#64748B] text-center max-w-sm">{description}</p>

      {/* Action Button */}
      {actionLabel && onAction && (
        <button className="saas-button-primary mt-6" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
