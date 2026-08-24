"use client";

import React, { useState, useEffect } from "react";
import { companyLocationService } from "@/services/companyLocationService";

export default function CompanyLocationStep({ register, errors, setValue, watch }) {
  const [companies, setCompanies] = useState([]);
  const [allLocations, setAllLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const selectedCompanyId = watch ? watch("companyName") : "";
  const selectedLocationId = watch ? watch("location") : "";

  // Fetch companies & locations on mount
  useEffect(() => {
    let isMounted = true;
    const loadCompaniesAndLocations = async () => {
      setLoading(true);
      setFetchError("");
      try {
        const [compRes, locRes] = await Promise.all([
          companyLocationService.getCompanies(),
          companyLocationService.getLocations(),
        ]);

        if (isMounted) {
          if (compRes && compRes.status) {
            setCompanies(compRes.data || []);
          }
          if (locRes && locRes.status) {
            setAllLocations(locRes.data || []);
          }
        }
      } catch (err) {
        if (isMounted) {
          setFetchError("Could not load companies or locations. Please check backend server.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCompaniesAndLocations();
    return () => {
      isMounted = false;
    };
  }, []);

  // Match selected company object by id (value is now id, not name)
  const selectedCompany = companies.find(
    (c) => String(c.id) === String(selectedCompanyId)
  );

  // Filter locations matching: location.company_id === selectedCompany.id
  const availableLocations = selectedCompany
    ? allLocations.filter(
        (loc) => String(loc.company_id) === String(selectedCompany.id)
      )
    : [];

  // ======================================================
  // COMPANY CHANGE
  //
  // Stores BOTH the id (companyName -> sent as company_id)
  // AND the display text (companyNameText -> sent as
  // company_name) because the backend now requires the
  // text field as well as the id.
  // ======================================================

  const handleCompanyChange = (e) => {
    const val = e.target.value;
    const company = companies.find((c) => String(c.id) === String(val));

    if (setValue) {
      setValue("companyName", val, { shouldValidate: true, shouldTouch: true });
      setValue("companyNameText", company ? company.company_name : "", {
        shouldValidate: true,
      });

      // Reset location + its text whenever company changes
      setValue("location", "", { shouldValidate: true });
      setValue("locationText", "", { shouldValidate: true });
    }
  };

  // ======================================================
  // LOCATION CHANGE
  //
  // Stores BOTH the id (location -> sent as location_id)
  // AND the display text (locationText -> sent as location)
  // ======================================================

  const handleLocationChange = (e) => {
    const val = e.target.value;
    const loc = availableLocations.find((l) => String(l.id) === String(val));

    if (setValue) {
      setValue("location", val, { shouldValidate: true, shouldTouch: true });
      setValue("locationText", loc ? loc.location_name : "", {
        shouldValidate: true,
      });
    }
  };

  const compRegistration = register ? register("companyName") : {};
  const locRegistration = register ? register("location") : {};

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-100 pb-3 mb-3">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-extrabold">
            5
          </span>
          Company & Location Selection
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Select your associated corporate entity and operational location.
        </p>
      </div>

      {fetchError && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <span>⚠️ {fetchError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Company Dropdown */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Company Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <select
              name={compRegistration.name}
              ref={compRegistration.ref}
              onBlur={compRegistration.onBlur}
              value={selectedCompanyId || ""}
              onChange={(e) => {
                if (typeof compRegistration.onChange === "function") {
                  compRegistration.onChange(e);
                }
                handleCompanyChange(e);
              }}
              disabled={loading}
              className={`w-full bg-slate-50 border ${
                errors?.companyName ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-blue-500"
              } text-slate-900 rounded-xl pl-10 pr-8 py-2.5 text-xs focus:outline-none focus:ring-2 focus:border-transparent transition-all appearance-none cursor-pointer disabled:opacity-50 truncate`}
            >
              <option value="">
                {loading ? "-- Loading Companies... --" : "-- Select Company --"}
              </option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {errors?.companyName && (
            <p className="text-xs text-red-500 mt-1 font-medium">{errors.companyName.message}</p>
          )}
        </div>

        {/* Location Dropdown */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Location <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <select
              name={locRegistration.name}
              ref={locRegistration.ref}
              onBlur={locRegistration.onBlur}
              value={selectedLocationId || ""}
              onChange={(e) => {
                if (typeof locRegistration.onChange === "function") {
                  locRegistration.onChange(e);
                }
                handleLocationChange(e);
              }}
              disabled={loading || !selectedCompany || availableLocations.length === 0}
              className={`w-full bg-slate-50 border ${
                errors?.location ? "border-red-400 focus:ring-red-400" : "border-slate-200 focus:ring-blue-500"
              } text-slate-900 rounded-xl pl-10 pr-8 py-2.5 text-xs focus:outline-none focus:ring-2 focus:border-transparent transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed truncate`}
            >
              <option value="">
                {!selectedCompany
                  ? "-- Select Company First --"
                  : availableLocations.length === 0
                  ? "-- No Locations Available --"
                  : "-- Select Location --"}
              </option>
              {availableLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.location_name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {errors?.location && (
            <p className="text-xs text-red-500 mt-1 font-medium">{errors.location.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}