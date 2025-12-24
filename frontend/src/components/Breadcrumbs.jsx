import React from "react";
import { useNavigate } from "react-router-dom";

export default function Breadcrumbs({ crumbs = [], className = "" }) {
  const navigate = useNavigate();

  return (
    <nav className={`flex items-center gap-1 sm:gap-2 text-xs sm:text-sm ${className} mb-4 sm:mb-5 md:mb-6 overflow-x-auto pb-1`} aria-label="breadcrumb">
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={() => {
              if (c.to) return navigate(c.to);
              if (typeof c.onClick === "function") return c.onClick();
            }}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md font-medium transition-all duration-200 text-xs whitespace-nowrap ${
              !c.to && !c.onClick
                ? "text-gray-900 cursor-default bg-gray-100"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
            }`}
            disabled={!c.to && !c.onClick}
            aria-current={i === crumbs.length - 1 ? "page" : undefined}
          >
            {c.label}
          </button>

          {i < crumbs.length - 1 && (
            <span className="text-gray-400 text-xs sm:text-sm">›</span>
          )}
        </span>
      ))}
    </nav>
  );
}
