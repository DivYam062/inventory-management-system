const Card = ({
  title,
  description,
  actions,
  children,
  className = "",
  bodyClassName = "",
}) => {
  const hasHeader = title || description || actions;

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-gray-900">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-gray-500">{description}</p>
            )}
          </div>

          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      <div className={`p-6 ${bodyClassName}`}>{children}</div>
    </div>
  );
};

export default Card;
