import React, { ReactNode } from "react";
import { Loader2 } from "lucide-react";

export interface CardProps {
  title?: string;
  subtitle?: string;
  badge?: string;
  badgeClassName?: string;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentDivider?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
  interactive?: boolean;
}

const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  badge,
  badgeClassName = "bg-gray-100 text-gray-600",
  actions,
  children,
  footer,
  className = "",
  contentDivider = false,
  icon,
  onClick,
  interactive = false,
}) => (
  <div
    className={`bg-white rounded-lg border border-gray-200 p-3 ${
      onClick || interactive
        ? "cursor-pointer hover:shadow-sm hover:bg-gray-50 transition-all duration-150"
        : ""
    } ${className}`}
    onClick={onClick}
  >
    {(title || actions) && (
      <div className="flex items-center justify-between mb-2">
        {(title || icon || badge || subtitle) && (
          <div className="flex items-center gap-2">
            {icon && <span className="flex-shrink-0">{icon}</span>}
            <div>
              {title && (
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-sm font-medium text-gray-700">
                    {title}
                  </span>
                  {badge && (
                    <span
                      className={`text-xs py-0.5 px-1.5 rounded ${badgeClassName}`}
                    >
                      {badge}
                    </span>
                  )}
                </div>
              )}
              {subtitle && (
                <div className="text-xs text-gray-500">{subtitle}</div>
              )}
            </div>
          </div>
        )}
        {actions && (
          <div className="flex items-center gap-1 ml-2">{actions}</div>
        )}
      </div>
    )}

    <div
      className={`w-full ${contentDivider && (title || actions) ? "border-t border-gray-100 pt-2" : ""}`}
    >
      {children}
    </div>

    {footer && <div className="mt-2 text-xs">{footer}</div>}
  </div>
);

export interface ShortcutCardProps extends Omit<CardProps, "badge"> {
  commandType?: string;
  isSaving?: boolean;
  note?: string;
}

export const ShortcutCard: React.FC<ShortcutCardProps> = ({
  commandType,
  isSaving = false,
  note,
  title,
  actions,
  children,
  ...rest
}) => (
  <Card
    title={title}
    badge={commandType}
    badgeClassName="bg-gray-100 text-gray-600"
    actions={actions}
    footer={note && <p className="text-gray-500">{note}</p>}
    icon={
      isSaving ? (
        <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
      ) : undefined
    }
    contentDivider={true}
    {...rest}
  >
    <div className="py-1 w-full">{children}</div>
  </Card>
);

export interface ConfigCardProps extends Omit<CardProps, "children"> {
  provider: string;
  model: string;
  config?: {
    temperature?: number;
    maxTokens?: number;
    [key: string]: any;
  };
  actions?: ReactNode;
}

export const ConfigCard: React.FC<ConfigCardProps> = ({
  title,
  provider,
  model,
  config,
  actions,
  ...rest
}) => (
  <Card title={title} actions={actions} interactive={true} {...rest}>
    <div className="text-xs">
      <div className="text-gray-600">
        {provider} - {model}
      </div>
      {config && (
        <div className="text-gray-500">
          Temperature: {config.temperature}, Max Tokens: {config.maxTokens}
        </div>
      )}
    </div>
  </Card>
);

export interface PromptCardProps extends Omit<CardProps, "children"> {
  provider: string;
  shortcutKeys?: string[];
  template: string;
  actions?: ReactNode;
}

export const PromptCard: React.FC<PromptCardProps> = ({
  title,
  provider,
  shortcutKeys,
  template,
  actions,
  ...rest
}) => (
  <Card title={title} actions={actions} interactive={true} {...rest}>
    <div className="text-xs">
      <p className="text-gray-600">Provider: {provider}</p>
      {shortcutKeys && shortcutKeys.length > 0 && (
        <div className="flex items-center flex-wrap mt-1">
          <span className="text-gray-600 mr-1">Shortcut:</span>
          <div className="flex flex-wrap gap-1">
            {shortcutKeys.map((key, idx) => (
              <kbd
                key={idx}
                className="px-1 py-0.5 rounded shadow-sm bg-gray-100 border border-gray-300 text-gray-700"
              >
                {key}
              </kbd>
            ))}
          </div>
        </div>
      )}
      <div className="mt-2 bg-gray-50 p-2 rounded border border-gray-200 text-gray-700">
        <p className="whitespace-pre-wrap line-clamp-3">{template}</p>
      </div>
    </div>
  </Card>
);

export interface EmptyCardProps {
  message: string;
  className?: string;
}

export const EmptyCard: React.FC<EmptyCardProps> = ({
  message,
  className = "",
}) => (
  <div
    className={`bg-gray-50 border border-gray-200 rounded-lg p-3 text-center text-gray-500 text-sm ${className}`}
  >
    {message}
  </div>
);

export default Card;
