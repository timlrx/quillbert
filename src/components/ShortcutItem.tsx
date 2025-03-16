import { formatKey, sortKeys } from "@/utils/keyboardUtils";
import { X } from "lucide-react";

export type Shortcut = string[];

interface ShortcutItemProps {
  shortcut: string[];
  isEditing: boolean;
  currentKeys: string[];
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function ShortcutItem({
  shortcut,
  isEditing,
  currentKeys,
  onEdit,
  onSave,
  onCancel,
}: ShortcutItemProps) {
  const renderKeys = (keys: string[]) => {
    const sortedKeys = sortKeys(keys);
    return sortedKeys.map((key, index) => (
      <kbd
        key={index}
        className="px-1.5 py-0.5 text-xs font-medium rounded shadow-sm bg-gray-100 border border-gray-300 text-gray-700"
      >
        {formatKey(key)}
      </kbd>
    ));
  };

  return (
    <div className="flex items-center justify-between w-full">
      {isEditing ? (
        <>
          <div className="flex flex-wrap gap-1 min-w-[120px]">
            {currentKeys.length > 0 ? (
              renderKeys(currentKeys)
            ) : (
              <span className="italic text-gray-500 text-xs px-1.5 py-0.5">
                Press keys...
              </span>
            )}
          </div>
          <div className="flex gap-1 ml-auto">
            <button
              onClick={onSave}
              className="px-2 py-0.5 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
            <button
              onClick={onCancel}
              className="p-0.5 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-1">
            {shortcut.length > 0 ? (
              renderKeys(shortcut)
            ) : (
              <span className="text-gray-400 text-xs italic">
                No shortcut set
              </span>
            )}
          </div>
          <button
            onClick={onEdit}
            className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors ml-auto"
          >
            Edit
          </button>
        </>
      )}
    </div>
  );
}
