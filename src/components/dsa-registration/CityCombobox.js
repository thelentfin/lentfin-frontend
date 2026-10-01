"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { City, State } from "country-state-city";

// Pre-curated top major Indian cities to show as initial suggestions when query is empty
const POPULAR_INDIAN_CITIES = [
  { name: "Ahmedabad", state: "Gujarat" },
  { name: "Surat", state: "Gujarat" },
  { name: "Vadodara", state: "Gujarat" },
  { name: "Rajkot", state: "Gujarat" },
  { name: "Mumbai", state: "Maharashtra" },
  { name: "Pune", state: "Maharashtra" },
  { name: "Delhi", state: "Delhi" },
  { name: "Bengaluru", state: "Karnataka" },
  { name: "Hyderabad", state: "Telangana" },
  { name: "Jaipur", state: "Rajasthan" },
  { name: "Indore", state: "Madhya Pradesh" },
  { name: "Kolkata", state: "West Bengal" },
  { name: "Chennai", state: "Tamil Nadu" },
  { name: "Lucknow", state: "Uttar Pradesh" },
  { name: "Chandigarh", state: "Chandigarh" },
];

// Lazy-loaded memoized cache for all 4,000+ Indian cities
let cachedAllCities = null;

function getAllIndianCities() {
  if (cachedAllCities) return cachedAllCities;
  try {
    const states = State.getStatesOfCountry("IN") || [];
    const stateMap = {};
    states.forEach((s) => {
      stateMap[s.isoCode] = s.name;
    });

    const rawCities = City.getCitiesOfCountry("IN") || [];
    cachedAllCities = rawCities.map((c) => {
      const stateName = stateMap[c.stateCode] || c.stateCode || "";
      return {
        name: c.name,
        state: stateName,
        label: stateName ? `${c.name}, ${stateName}` : c.name,
        lowerName: c.name.toLowerCase(),
        lowerState: stateName.toLowerCase(),
      };
    });
  } catch (err) {
    console.error("Error loading Indian cities:", err);
    cachedAllCities = [];
  }
  return cachedAllCities;
}

/**
 * CityCombobox - Indian Cities Searchable Combobox with Free-text Manual Fallback
 * Designed to seamlessly match the SaasSelect / LentFin form styling.
 */
export default function CityCombobox({
  value = "",
  onChange,
  onBlur,
  placeholder = "Search Indian city or enter manually...",
  disabled = false,
  hasError = false,
  errorMessage = "",
  id = "dsa-city-input",
  name = "city",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value || "");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Sync internal state when external value changes
  useEffect(() => {
    setSearchQuery(value || "");
  }, [value]);

  // Lazy-load cities list
  const allCities = useMemo(() => {
    return getAllIndianCities();
  }, []);

  // Filter cities based on search query
  const filteredCities = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    if (!q) {
      return POPULAR_INDIAN_CITIES.map((c) => ({
        name: c.name,
        state: c.state,
        label: `${c.name}, ${c.state}`,
        lowerName: c.name.toLowerCase(),
        lowerState: c.state.toLowerCase(),
      }));
    }

    // Exact matches / prefix matches first, then substring matches
    const prefixMatches = [];
    const substringMatches = [];

    for (let i = 0; i < allCities.length; i++) {
      const item = allCities[i];
      if (item.lowerName.startsWith(q)) {
        prefixMatches.push(item);
        if (prefixMatches.length >= 25) break;
      } else if (item.lowerName.includes(q) || item.lowerState.includes(q)) {
        substringMatches.push(item);
      }
    }

    const combined = [...prefixMatches, ...substringMatches].slice(0, 25);
    return combined;
  }, [searchQuery, allCities]);

  // Check if current search query exactly matches an existing city
  const hasExactMatch = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    if (!q) return false;
    return filteredCities.some(
      (c) => c.lowerName === q || c.label.toLowerCase() === q
    );
  }, [searchQuery, filteredCities]);

  // Close dropdown on outside click and commit manual value if typed
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        // If user typed something and clicked outside, keep their manual city
        const trimmed = (searchQuery || "").trim();
        if (trimmed && trimmed !== value) {
          onChange?.(trimmed);
        }
        onBlur?.();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchQuery, value, onChange, onBlur]);

  // Select an option from the list
  const handleSelectOption = useCallback(
    (item) => {
      const selectedText = item.label || item.name;
      setSearchQuery(selectedText);
      onChange?.(selectedText);
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [onChange]
  );

  // Select the manual custom text
  const handleSelectManual = useCallback(() => {
    const trimmed = (searchQuery || "").trim();
    if (trimmed) {
      onChange?.(trimmed);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, [searchQuery, onChange]);

  // Handle typing inside the input
  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    onChange?.(val);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
        return;
      }
    }

    const totalItems = filteredCities.length + (!hasExactMatch && searchQuery.trim() ? 1 : 0);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < totalItems ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredCities.length) {
        handleSelectOption(filteredCities[highlightedIndex]);
      } else if (
        !hasExactMatch &&
        searchQuery.trim() &&
        (highlightedIndex === filteredCities.length || highlightedIndex === -1)
      ) {
        handleSelectManual();
      } else {
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSearchQuery("");
    onChange?.("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full text-xs">
      {/* Input Container styled identically to SaasSelect trigger */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          disabled={disabled}
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full bg-slate-50 rounded-xl pl-10 pr-9 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 border transition-all cursor-text outline-none select-text ${
            disabled
              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
              : hasError
              ? "bg-white text-slate-900 border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-400/20"
              : isOpen
              ? "bg-white text-slate-900 border-[#B063FF] ring-2 ring-[#B063FF]/20 shadow-2xs"
              : "bg-slate-50 text-slate-900 border-slate-200 hover:border-slate-300 shadow-2xs focus:bg-white focus:border-[#B063FF] focus:ring-2 focus:ring-[#B063FF]/20"
          }`}
        />

        {/* Location Pin Icon on the Left (Matches SaasSelect Left Icon Position) */}
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 z-10">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>

        {/* Right Action Icons: Clear Button or Dropdown Chevron */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5 z-10">
          {searchQuery && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors cursor-pointer"
              title="Clear input"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (!disabled) {
                setIsOpen(!isOpen);
                inputRef.current?.focus();
              }
            }}
            tabIndex={-1}
            className="text-slate-400 hover:text-[#B063FF] transition-colors cursor-pointer"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
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
        </div>
      </div>

      {/* Floating Dropdown Popover (Identical to SaasSelect Popover Styling) */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 z-50 mt-1.5 rounded-xl border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xl py-1 text-xs animate-in fade-in zoom-in-95 duration-100 max-h-56 overflow-y-auto custom-scrollbar"
        >
          {/* Header Title / Helper */}
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
            <span>{searchQuery.trim() ? "Matching Indian Cities" : "Popular Indian Cities"}</span>
            <span className="text-[9px] text-[#B063FF] lowercase">Select or type custom</span>
          </div>

          {/* List of Filtered Cities */}
          {filteredCities.map((item, index) => {
            const isSelected =
              value &&
              (value.toLowerCase() === item.name.toLowerCase() ||
                value.toLowerCase() === item.label.toLowerCase());
            const isHighlighted = highlightedIndex === index;

            return (
              <button
                key={`${item.name}-${item.state}-${index}`}
                type="button"
                onClick={() => handleSelectOption(item)}
                className={`w-full px-3.5 py-2 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer select-none ${
                  isSelected
                    ? "bg-purple-50 text-purple-900 font-semibold"
                    : isHighlighted
                    ? "bg-purple-50/70 text-purple-900"
                    : "text-slate-700 hover:bg-purple-50/60 hover:text-purple-900 font-normal"
                }`}
              >
                <div className="truncate flex items-center gap-2">
                  <span className="text-slate-400 text-xs">📍</span>
                  <span className="font-medium text-slate-900">{item.name}</span>
                  {item.state && (
                    <span className="text-slate-400 text-[11px] font-normal">
                      • {item.state}
                    </span>
                  )}
                </div>

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
          })}

          {/* If No Cities Found in Library */}
          {filteredCities.length === 0 && (
            <div className="px-3.5 py-2.5 text-center text-slate-400 italic text-[11px]">
              No matching Indian cities found in standard registry
            </div>
          )}

          {/* Fallback Manual City Option (Always offered when user enters a query) */}
          {searchQuery.trim() && (
            <div className="border-t border-slate-100 mt-1 pt-1 bg-slate-50/60">
              <button
                type="button"
                onClick={handleSelectManual}
                className={`w-full px-3.5 py-2 text-left flex items-center gap-2 text-xs transition-colors cursor-pointer select-none ${
                  highlightedIndex === filteredCities.length
                    ? "bg-purple-100 text-[#B063FF] font-semibold"
                    : "text-[#B063FF] hover:bg-purple-50 font-medium"
                }`}
              >
                <span className="text-sm">➕</span>
                <span className="truncate">
                  Use manual city: <strong className="text-slate-900 font-semibold">&ldquo;{searchQuery.trim()}&rdquo;</strong>
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {hasError && errorMessage && (
        <p className="text-xs text-red-500 mt-1.5 font-medium">{errorMessage}</p>
      )}
    </div>
  );
}
