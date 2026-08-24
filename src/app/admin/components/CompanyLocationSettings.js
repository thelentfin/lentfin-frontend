"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast as sonnerToast } from "sonner";
import { companyLocationService } from "@/services/companyLocationService";

export default function CompanyLocationSettings({ onBack = null }) {
  const [companies, setCompanies] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal States
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);
  const [isDeleteCompanyOpen, setIsDeleteCompanyOpen] = useState(false);

  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [isEditLocationOpen, setIsEditLocationOpen] = useState(false);
  const [isDeleteLocationOpen, setIsDeleteLocationOpen] = useState(false);

  // Active items being edited or deleted
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Form States — Add Company
  const [companyForm, setCompanyForm] = useState({
    company_name: "",
    company_code: "",
    company_email: "",
    company_mobile: "",
    address: "",
  });
  const [initialLocations, setInitialLocations] = useState([""]); // Dynamic locations

  // Form States — Edit Company
  const [editCompanyForm, setEditCompanyForm] = useState({
    company_name: "",
    company_code: "",
    company_email: "",
    company_mobile: "",
    address: "",
    status: 1,
  });

  // Form States — Add / Edit Location
  const [locationForm, setLocationForm] = useState({
    company_id: "",
    location_name: "",
  });
  const [editLocationForm, setEditLocationForm] = useState({
    company_id: "",
    location_name: "",
    status: 1,
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const showToast = (message, type = "success") => {
    if (type === "error") {
      sonnerToast.error(message);
    } else {
      sonnerToast.success(message);
    }
  };

  // Fetch Companies & Locations concurrently
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [compRes, locRes] = await Promise.all([
        companyLocationService.getCompanies(true),
        companyLocationService.getLocations(true),
      ]);

      if (compRes && compRes.status) {
        setCompanies(compRes.data || []);
      } else {
        setCompanies([]);
      }

      if (locRes && locRes.status) {
        setLocations(locRes.data || []);
      } else {
        setLocations([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load company and location data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── ADD COMPANY & DYNAMIC LOCATIONS ──────────────────────────────────────
  const handleAddLocationInput = () => {
    setInitialLocations((prev) => [...prev, ""]);
  };

  const handleRemoveLocationInput = (index) => {
    setInitialLocations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLocationInputChange = (index, value) => {
    setInitialLocations((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const submitAddCompany = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!companyForm.company_name.trim()) {
      setFormError("Company Name is required.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Add Company
      const compRes = await companyLocationService.addCompany(companyForm);
      if (!compRes || !compRes.status) {
        setFormError(compRes?.message || "Failed to add company.");
        setSubmitting(false);
        return;
      }

      // 2. Fetch updated companies to locate newly added company ID
      const updatedCompRes = await companyLocationService.getCompanies();
      const newCompList = updatedCompRes?.data || [];
      const createdCompany = newCompList.find(
        (c) => c.company_name.trim().toLowerCase() === companyForm.company_name.trim().toLowerCase()
      );

      // 3. Add each non-empty location sequentially
      const validLocations = initialLocations
        .map((loc) => loc.trim())
        .filter((loc) => loc.length > 0);

      if (createdCompany && createdCompany.id && validLocations.length > 0) {
        for (const locName of validLocations) {
          await companyLocationService.addLocation({
            company_id: createdCompany.id,
            location_name: locName,
          });
        }
      }

      showToast("Company and locations added successfully!");
      setIsAddCompanyOpen(false);
      setCompanyForm({ company_name: "", company_code: "", company_email: "", company_mobile: "", address: "" });
      setInitialLocations([""]);
      fetchData();
    } catch (err) {
      setFormError(err.message || "An error occurred while adding company.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── EDIT COMPANY ──────────────────────────────────────────────────────────
  const openEditCompany = (company) => {
    setSelectedCompany(company);
    setEditCompanyForm({
      company_name: company.company_name || "",
      company_code: company.company_code || "",
      company_email: company.company_email || "",
      company_mobile: company.company_mobile || "",
      address: company.address || "",
      status: company.status ?? 1,
    });
    setFormError("");
    setIsEditCompanyOpen(true);
  };

  const submitEditCompany = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!editCompanyForm.company_name.trim()) {
      setFormError("Company Name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await companyLocationService.updateCompany(selectedCompany.id, editCompanyForm);
      if (res && res.status) {
        showToast("Company updated successfully!");
        setIsEditCompanyOpen(false);
        fetchData();
      } else {
        setFormError(res?.message || "Failed to update company.");
      }
    } catch (err) {
      setFormError(err.message || "Error updating company.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── DELETE COMPANY ────────────────────────────────────────────────────────
  const openDeleteCompany = (company) => {
    setSelectedCompany(company);
    setIsDeleteCompanyOpen(true);
  };

  const submitDeleteCompany = async () => {
    setSubmitting(true);
    try {
      const res = await companyLocationService.deleteCompany(selectedCompany.id);
      if (res && res.status) {
        showToast("Company deleted successfully!");
        setIsDeleteCompanyOpen(false);
        fetchData();
      } else {
        showToast(res?.message || "Failed to delete company.", "error");
      }
    } catch (err) {
      showToast(err.message || "Error deleting company.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── ADD SINGLE LOCATION ───────────────────────────────────────────────────
  const openAddLocation = (companyId = "") => {
    setLocationForm({ company_id: companyId, location_name: "" });
    setFormError("");
    setIsAddLocationOpen(true);
  };

  const submitAddLocation = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!locationForm.company_id) {
      setFormError("Please select a company.");
      return;
    }
    if (!locationForm.location_name.trim()) {
      setFormError("Location Name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await companyLocationService.addLocation(locationForm);
      if (res && res.status) {
        showToast("Location added successfully!");
        setIsAddLocationOpen(false);
        fetchData();
      } else {
        setFormError(res?.message || "Failed to add location.");
      }
    } catch (err) {
      setFormError(err.message || "Error adding location.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── EDIT LOCATION ─────────────────────────────────────────────────────────
  const openEditLocation = (loc) => {
    setSelectedLocation(loc);
    setEditLocationForm({
      company_id: loc.company_id || "",
      location_name: loc.location_name || "",
      status: loc.status ?? 1,
    });
    setFormError("");
    setIsEditLocationOpen(true);
  };

  const submitEditLocation = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!editLocationForm.company_id) {
      setFormError("Company is required.");
      return;
    }
    if (!editLocationForm.location_name.trim()) {
      setFormError("Location Name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await companyLocationService.updateLocation(selectedLocation.id, editLocationForm);
      if (res && res.status) {
        showToast("Location updated successfully!");
        setIsEditLocationOpen(false);
        fetchData();
      } else {
        setFormError(res?.message || "Failed to update location.");
      }
    } catch (err) {
      setFormError(err.message || "Error updating location.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── DELETE LOCATION ───────────────────────────────────────────────────────
  const openDeleteLocation = (loc) => {
    setSelectedLocation(loc);
    setIsDeleteLocationOpen(true);
  };

  const submitDeleteLocation = async () => {
    setSubmitting(true);
    try {
      const res = await companyLocationService.deleteLocation(selectedLocation.id);
      if (res && res.status) {
        showToast("Location deleted successfully!");
        setIsDeleteLocationOpen(false);
        fetchData();
      } else {
        showToast(res?.message || "Failed to delete location.", "error");
      }
    } catch (err) {
      showToast(err.message || "Error deleting location.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back to Settings Navigation Button */}
      {onBack && (
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200/80 hover:bg-slate-50 px-3 py-1.5 rounded-md transition-colors cursor-pointer"
          >
            <span>←</span>
            <span>Back to Settings</span>
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-slate-200/80 bg-white p-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <span>🏢</span> Company & Location Settings
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 font-normal">
            Manage corporate entities, branch locations, and operational parameters across LentFin.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => openAddLocation()}
            className="flex items-center gap-1.5 rounded-md border border-slate-200/80 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <span>+</span> Add Location
          </button>
          <button
            onClick={() => {
              setCompanyForm({ company_name: "", company_code: "", company_email: "", company_mobile: "", address: "" });
              setInitialLocations([""]);
              setFormError("");
              setIsAddCompanyOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <span>+</span> Add Company
          </button>
        </div>
      </div>

      {/* API Error Alert */}
      {error && (
        <div className="rounded-md border border-red-200/80 bg-red-50 p-3.5 text-xs text-red-700 flex items-center justify-between font-normal">
          <span>⚠️ {error}</span>
          <button
            onClick={fetchData}
            className="font-medium underline hover:text-red-900 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white rounded-lg border border-slate-200/80">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-normal text-slate-500">Loading Companies & Locations...</p>
          </div>
        </div>
      ) : companies.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 bg-white rounded-lg border border-slate-200/80 p-8">
          <div className="w-12 h-12 bg-slate-100 border border-slate-200/80 text-slate-600 rounded-md flex items-center justify-center mx-auto mb-3 text-xl">
            🏢
          </div>
          <h3 className="text-xs font-semibold text-slate-900">No Companies Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto font-normal">
            No corporate entities are registered yet. Click below to add your first company along with its operational locations.
          </p>
          <button
            onClick={() => setIsAddCompanyOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <span>+</span> Add First Company
          </button>
        </div>
      ) : (
        /* Companies List with Matched Locations */
        <div className="space-y-6">
          {companies.map((company) => {
            const matchedLocations = locations.filter(
              (loc) => String(loc.company_id) === String(company.id)
            );

            return (
              <div
                key={company.id}
                className="rounded-lg border border-slate-200/80 bg-white overflow-hidden"
              >
                {/* Company Card Header */}
                <div className="p-4 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                      {company.company_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">{company.company_name}</h3>
                        {company.company_code && (
                          <span className="rounded bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 text-[10px] font-mono text-slate-700 uppercase tracking-wider">
                            {company.company_code}
                          </span>
                        )}
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-medium border ${
                            Number(company.status) === 1
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                              : "bg-slate-100 text-slate-600 border-slate-200/80"
                          }`}
                        >
                          {Number(company.status) === 1 ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-normal">
                        {company.company_email && (
                          <span>✉️ {company.company_email}</span>
                        )}
                        {company.company_mobile && (
                          <span className="font-mono tabular-nums">📞 {company.company_mobile}</span>
                        )}
                        {company.address && (
                          <span>📍 {company.address}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Company Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openAddLocation(company.id)}
                      className="rounded-md bg-white border border-slate-200/80 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>+</span> Add Location
                    </button>
                    <button
                      onClick={() => openEditCompany(company)}
                      className="rounded-md border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteCompany(company)}
                      className="rounded-md border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Locations Section inside Company Card */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <span>📍</span> Operational Locations ({matchedLocations.length})
                    </h4>
                  </div>

                  {matchedLocations.length === 0 ? (
                    <div className="rounded-md border border-slate-200/80 bg-slate-50/50 p-3 text-center">
                      <p className="text-xs text-slate-400 font-normal">No locations added for this company yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                      {matchedLocations.map((loc) => (
                        <div
                          key={loc.id}
                          className="flex items-center justify-between p-2.5 rounded-md border border-slate-200/80 bg-slate-50/50 hover:bg-slate-100/60 transition-colors group"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-medium text-slate-900 truncate">
                              {loc.location_name}
                            </p>
                            <span
                              className={`text-[10px] font-normal ${
                                Number(loc.status) === 1 ? "text-emerald-700" : "text-slate-400"
                              }`}
                            >
                              {Number(loc.status) === 1 ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => openEditLocation(loc)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                              title="Edit Location"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => openDeleteLocation(loc)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                              title="Delete Location"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MODAL: ADD COMPANY & DYNAMIC LOCATIONS ───────────────────────── */}
      {isAddCompanyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 border border-slate-200/80 shadow-lg my-8">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 mb-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span>🏢</span> Add New Company
              </h3>
              <button
                onClick={() => setIsAddCompanyOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-md bg-red-50 border border-red-200/80 p-3 text-xs text-red-700 font-normal">
                {formError}
              </div>
            )}

            <form onSubmit={submitAddCompany} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Urban Money"
                  value={companyForm.company_name}
                  onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Company Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UM01"
                    value={companyForm.company_code}
                    onChange={(e) => setCompanyForm({ ...companyForm, company_code: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Contact Mobile
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile"
                    value={companyForm.company_mobile}
                    onChange={(e) => setCompanyForm({ ...companyForm, company_mobile: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors font-mono tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Company Email
                </label>
                <input
                  type="email"
                  placeholder="info@company.com"
                  value={companyForm.company_email}
                  onChange={(e) => setCompanyForm({ ...companyForm, company_email: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Corporate Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter company address..."
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors resize-none"
                />
              </div>

              {/* Dynamic Locations Input */}
              <div className="pt-3 border-t border-slate-200/80">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-900">
                    Initial Locations (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddLocationInput}
                    className="text-xs font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                  >
                    <span>+</span> Add Location Field
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mb-2 font-normal">
                  Add initial branch locations for this company. Each location will be saved automatically.
                </p>

                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {initialLocations.map((loc, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`Location ${idx + 1} (e.g. Rajkot)`}
                        value={loc}
                        onChange={(e) => handleLocationInputChange(idx, e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-900 font-medium focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
                      />
                      {initialLocations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLocationInput(idx)}
                          className="text-slate-400 hover:text-red-600 p-1 font-medium text-xs cursor-pointer"
                          title="Remove location field"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setIsAddCompanyOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200/80 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-slate-900 text-white rounded-md text-xs font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? "Saving..." : "Save Company"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDIT COMPANY ─────────────────────────────────────────── */}
      {isEditCompanyOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 border border-slate-200/80 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Edit Company</h3>
              <button onClick={() => setIsEditCompanyOpen(false)} className="text-slate-400 hover:text-slate-700 text-xs p-1 rounded-md">✕</button>
            </div>

            {formError && (
              <div className="mb-4 rounded-md bg-red-50 border border-red-200/80 p-3 text-xs text-red-700 font-normal">
                {formError}
              </div>
            )}

            <form onSubmit={submitEditCompany} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={editCompanyForm.company_name}
                  onChange={(e) => setEditCompanyForm({ ...editCompanyForm, company_name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Company Code</label>
                  <input
                    type="text"
                    value={editCompanyForm.company_code}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, company_code: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={editCompanyForm.status}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, status: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors cursor-pointer"
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editCompanyForm.company_email}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, company_email: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Mobile</label>
                  <input
                    type="tel"
                    value={editCompanyForm.company_mobile}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, company_mobile: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors font-mono tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Address</label>
                <textarea
                  rows={2}
                  value={editCompanyForm.address}
                  onChange={(e) => setEditCompanyForm({ ...editCompanyForm, address: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setIsEditCompanyOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200/80 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-slate-900 text-white rounded-md text-xs font-medium hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Updating..." : "Update Company"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: DELETE COMPANY CONFIRMATION ──────────────────────────── */}
      {isDeleteCompanyOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-lg bg-white p-5 border border-slate-200/80 shadow-lg text-center space-y-3">
            <div className="w-10 h-10 rounded-md bg-red-50 border border-red-200/80 text-red-600 flex items-center justify-center mx-auto text-base font-semibold">
              ⚠️
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Delete Company</h3>
            <p className="text-xs text-slate-500 font-normal leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900">{selectedCompany.company_name}</strong>?
              This will remove the company record from the system.
            </p>

            <div className="flex items-center justify-center gap-2 pt-3 border-t border-slate-200/80">
              <button
                type="button"
                onClick={() => setIsDeleteCompanyOpen(false)}
                className="px-3.5 py-1.5 border border-slate-200/80 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitDeleteCompany}
                disabled={submitting}
                className="px-4 py-1.5 bg-red-600 text-white rounded-md text-xs font-medium hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Deleting..." : "Yes, Delete Company"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD SINGLE LOCATION ──────────────────────────────────── */}
      {isAddLocationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-lg bg-white p-5 border border-slate-200/80 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Add Location</h3>
              <button onClick={() => setIsAddLocationOpen(false)} className="text-slate-400 hover:text-slate-700 text-xs p-1 rounded-md">✕</button>
            </div>

            {formError && (
              <div className="mb-4 rounded-md bg-red-50 border border-red-200/80 p-3 text-xs text-red-700 font-normal">
                {formError}
              </div>
            )}

            <form onSubmit={submitAddLocation} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Select Company *</label>
                <select
                  required
                  value={locationForm.company_id}
                  onChange={(e) => setLocationForm({ ...locationForm, company_id: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors cursor-pointer"
                >
                  <option value="">-- Select Company --</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Location Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajkot Branch"
                  value={locationForm.location_name}
                  onChange={(e) => setLocationForm({ ...locationForm, location_name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setIsAddLocationOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200/80 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-slate-900 text-white rounded-md text-xs font-medium hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Saving..." : "Save Location"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDIT LOCATION ────────────────────────────────────────── */}
      {isEditLocationOpen && selectedLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-lg bg-white p-5 border border-slate-200/80 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Edit Location</h3>
              <button onClick={() => setIsEditLocationOpen(false)} className="text-slate-400 hover:text-slate-700 text-xs p-1 rounded-md">✕</button>
            </div>

            {formError && (
              <div className="mb-4 rounded-md bg-red-50 border border-red-200/80 p-3 text-xs text-red-700 font-normal">
                {formError}
              </div>
            )}

            <form onSubmit={submitEditLocation} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Company *</label>
                <select
                  required
                  value={editLocationForm.company_id}
                  onChange={(e) => setEditLocationForm({ ...editLocationForm, company_id: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors cursor-pointer"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Location Name *</label>
                <input
                  type="text"
                  required
                  value={editLocationForm.location_name}
                  onChange={(e) => setEditLocationForm({ ...editLocationForm, location_name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={editLocationForm.status}
                  onChange={(e) => setEditLocationForm({ ...editLocationForm, status: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors cursor-pointer"
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setIsEditLocationOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200/80 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-slate-900 text-white rounded-md text-xs font-medium hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Updating..." : "Update Location"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: DELETE LOCATION CONFIRMATION ─────────────────────────── */}
      {isDeleteLocationOpen && selectedLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-lg bg-white p-5 border border-slate-200/80 shadow-lg text-center space-y-3">
            <div className="w-10 h-10 rounded-md bg-red-50 border border-red-200/80 text-red-600 flex items-center justify-center mx-auto text-base font-semibold">
              🗑️
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Delete Location</h3>
            <p className="text-xs text-slate-500 font-normal leading-relaxed">
              Are you sure you want to delete location <strong className="text-slate-900">{selectedLocation.location_name}</strong>?
            </p>

            <div className="flex items-center justify-center gap-2 pt-3 border-t border-slate-200/80">
              <button
                type="button"
                onClick={() => setIsDeleteLocationOpen(false)}
                className="px-3.5 py-1.5 border border-slate-200/80 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitDeleteLocation}
                disabled={submitting}
                className="px-4 py-1.5 bg-red-600 text-white rounded-md text-xs font-medium hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Deleting..." : "Yes, Delete Location"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
