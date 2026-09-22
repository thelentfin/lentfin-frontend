"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";

/**
 * SaasSelect - A modern, sleek SaaS dropdown component
 *
 * Features:
 * - Lentfin Purple brand accents (#B063FF)
 * - Subtle glassmorphism backdrop blur with high readability
 * - Built-in search filter for long lists (e.g. 50+ Banks)
 * - Keyboard navigation & click-outside dismissal
 * - Smooth chevron transition and purple checkmark for active item
 */
export default function SaasSelect({
  options = [],
  value = "",
  onChange,
  placeholder = "Select an option...",
  disabled = false,
  hasError = false,
  searchable = false,
  className = "",
  buttonClassName = "",
  menuClassName = "",
  id,
  name,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize options to { value, label } format
  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === "object" && opt !== null) {
        return {
          value: opt.value !== undefined ? opt.value : opt.id,
          label: opt.label !== undefined ? opt.label : opt.name || String(opt.value),
          icon: opt.icon || null,
        };
      }
      return { value: opt, label: String(opt), icon: null };
    });
  }, [options]);

  // Find currently selected option object
  const selectedOption = useMemo(() => {
    if (value === undefined || value === null || String(value).trim() === "") {
      return null;
    }
    return (
      normalizedOptions.find(
        (opt) =>
          String(opt.value) === String(value) && String(opt.value).trim() !== ""
      ) || null
    );
  }, [normalizedOptions, value]);

  // Filter options if searchable
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const query = searchQuery.toLowerCase();
    return normalizedOptions.filter((opt) =>
      opt.label.toLowerCase().includes(query)
    );
  }, [normalizedOptions, searchQuery]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when menu opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, searchable]);

  // Handle keydown for escape
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setSearchQuery("");
    }
  };

  const handleSelect = (optValue) => {
    if (disabled) return;
    if (onChange) {
      onChange(optValue);
    }
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full text-xs ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden input for standard form serialization */}
      {name && (
        <input type="hidden" name={name} value={value || ""} id={id} />
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium rounded-md transition-all cursor-pointer select-none outline-none ${
          disabled
            ? "bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed"
            : hasError
            ? "bg-white text-slate-900 border border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-400/20"
            : isOpen
            ? "bg-white text-slate-900 border border-[#B063FF] ring-2 ring-[#B063FF]/20 shadow-2xs"
            : "bg-white text-slate-900 border border-slate-200 hover:border-slate-300 shadow-2xs"
        } ${buttonClassName}`}
      >
        <span className="truncate flex items-center gap-2">
          {selectedOption ? (
            <>
              {selectedOption.icon && <span>{selectedOption.icon}</span>}
              <span className="text-slate-900 font-medium">{selectedOption.label}</span>
            </>
          ) : (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          )}
        </span>

        {/* Purple Chevron indicator */}
        <svg
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[#B063FF]" : "text-slate-400"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Floating Popover */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 z-50 mt-1.5 rounded-lg border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xl py-1 text-xs animate-in fade-in zoom-in-95 duration-100 ${menuClassName}`}
        >
          {/* Search Box inside dropdown if searchable */}
          {searchable && (
            <div className="p-1.5 border-b border-slate-100">
              <div className="relative">
                <svg
                  className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-md pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#B063FF] focus:bg-white transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto custom-scrollbar py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2.5 text-center text-slate-400 italic text-[11px]">
                No options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const hasValue =
                  value !== undefined &&
                  value !== null &&
                  String(value).trim() !== "" &&
                  String(opt.value).trim() !== "";
                const isSelected = hasValue && String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer select-none ${
                      isSelected
                        ? "bg-purple-50 text-purple-900 font-semibold"
                        : "text-slate-700 hover:bg-purple-50/70 hover:text-purple-900 font-normal"
                    }`}
                  >
                    <span className="truncate flex items-center gap-2">
                      {opt.icon && <span>{opt.icon}</span>}
                      <span>{opt.label}</span>
                    </span>

                    {/* Checkmark icon for selected option */}
                    {isSelected && (
                      <svg
                        className="w-3.5 h-3.5 text-[#B063FF] shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
