import { SelectHTMLAttributes, forwardRef } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, label, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            className={`
              w-full px-3 py-2 text-sm
              rounded border border-gray-300 bg-white text-gray-700
              focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
              ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
              ${className || ""}
            `}
            ref={ref}
            {...props}
          >
            {children}
          </select>
          {/* Remove the custom chevron that was causing duplication */}
        </div>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-xs text-gray-500">{helperText}</p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";

export default Select;
