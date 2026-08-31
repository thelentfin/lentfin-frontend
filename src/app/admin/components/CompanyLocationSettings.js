"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast as sonnerToast } from "sonner";
import { companyLocationService } from "@/services/companyLocationService";

// Helper to normalize status values across different API/DB formats
const isStatusActive = (status) => {
  if (status === null || status === undefined) return false;
  const str = String(status).trim().toLowerCase();
  return str === "active" || str === "1";
};

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
  const [viewLocationsCompany, setViewLocationsCompany] = useState(null);

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
    status: "Active",
  });

  // Form States — Add / Edit Location
  const [locationForm, setLocationForm] = useState({
    company_id: "",
    location_name: "",
  });
  const [editLocationForm, setEditLocationForm] = useState({
    company_id: "",
    location_name: "",
    status: "Active",
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

  // Toggle Handlers
  const handleToggleCompanyStatus = async (company) => {
    const currentActive = isStatusActive(company.status);
    const nextStatus = currentActive ? "Inactive" : "Active";

    setCompanies((prev) =>
      prev.map((c) => (c.id === company.id ? { ...c, status: nextStatus } : c))
    );

    try {
      const res = await companyLocationService.updateCompany(company.id, {
        company_name: company.company_name,
        company_code: company.company_code || "",
        company_email: company.company_email || "",
        company_mobile: company.company_mobile || "",
        address: company.address || "",
        status: nextStatus,
      });

      if (res && res.status) {
        showToast(`Company status updated to ${nextStatus}`);
        fetchData();
      } else {
        setCompanies((prev) =>
          prev.map((c) => (c.id === company.id ? { ...c, status: company.status } : c))
        );
        showToast(res?.message || "Failed to update company status", "error");
      }
    } catch (err) {
      setCompanies((prev) =>
        prev.map((c) => (c.id === company.id ? { ...c, status: company.status } : c))
      );
      showToast(err.message || "Failed to update company status", "error");
    }
  };

  const handleToggleLocationStatus = async (loc) => {
    const currentActive = isStatusActive(loc.status);
    const nextStatus = currentActive ? "Inactive" : "Active";

    setLocations((prev) =>
      prev.map((l) => (l.id === loc.id ? { ...l, status: nextStatus } : l))
    );

    try {
      const res = await companyLocationService.updateLocation(loc.id, {
        company_id: loc.company_id,
        location_name: loc.location_name,
        status: nextStatus,
      });

      if (res && res.status) {
        showToast(`Location status updated to ${nextStatus}`);
        fetchData();
      } else {
        setLocations((prev) =>
          prev.map((l) => (l.id === loc.id ? { ...l, status: loc.status } : l))
        );
        showToast(res?.message || "Failed to update location status", "error");
      }
    } catch (err) {
      setLocations((prev) =>
        prev.map((l) => (l.id === loc.id ? { ...l, status: loc.status } : l))
      );
      showToast(err.message || "Failed to update location status", "error");
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
      status: isStatusActive(company.status) ? "Active" : "Inactive",
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
      status: isStatusActive(loc.status) ? "Active" : "Inactive",
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
            <span>Back</span>
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
            className="flex items-center gap-1.5 rounded-md btn-primary px-3.5 py-1.5 text-xs font-medium text-white transition-colors cursor-pointer"
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
            className="mt-4 inline-flex items-center gap-1.5 rounded-md btn-primary px-4 py-2 text-xs font-medium text-white transition-colors cursor-pointer"
          >
            <span>+</span> Add First Company
          </button>
        </div>
      ) : (
        /* Companies Table */
        <div className="rounded-lg border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4 text-center">View Locations</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {companies.map((company) => {
                  const matchedLocations = locations.filter(
                    (loc) => String(loc.company_id) === String(company.id)
                  );
                  const companyActive = isStatusActive(company.status);

                  return (
                    <tr key={company.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Company Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                            {company.company_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-900">{company.company_name}</span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4 text-slate-600 font-normal">
                        {company.company_email ? company.company_email : <span className="text-slate-300">—</span>}
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4 text-slate-600 font-mono tabular-nums">
                        {company.company_mobile ? company.company_mobile : <span className="text-slate-300">—</span>}
                      </td>

                      {/* View Locations */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setViewLocationsCompany(company)}
                          title={`View Locations (${matchedLocations.length})`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center justify-center">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={companyActive}
                            title={companyActive ? "Deactivate Company" : "Activate Company"}
                            onClick={() => handleToggleCompanyStatus(company)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-slate-900 ${
                              companyActive ? "bg-slate-900" : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                companyActive ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditCompany(company)}
                            title="Edit Company"
                            aria-label="Edit Company"
                            className="p-1.5 rounded-md border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer inline-flex items-center justify-center"
                          >
                            <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteCompany(company)}
                            title="Delete Company"
                            aria-label="Delete Company"
                            className="p-1.5 rounded-md border border-slate-200/80 bg-white text-red-600 hover:bg-red-50 transition-colors cursor-pointer inline-flex items-center justify-center"
                          >
                            <svg className="w-3.5 h-3.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL: VIEW OPERATIONAL LOCATIONS ───────────────────────── */}
      {viewLocationsCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-2xl rounded-lg bg-white border border-slate-200/80 shadow-xl overflow-hidden my-8 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                  {viewLocationsCompany.company_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 truncate flex items-center gap-2">
                    <span>{viewLocationsCompany.company_name}</span>
                    <span className="text-xs font-normal text-slate-400">·</span>
                    <span className="text-xs font-medium text-slate-600">Operational Locations</span>
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCompany(viewLocationsCompany);
                    setLocationForm({ company_id: viewLocationsCompany.id, location_name: "" });
                    setIsAddLocationOpen(true);
                  }}
                  className="rounded-md btn-primary px-2.5 py-1 text-xs font-medium text-white transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>+</span> Add Location
                </button>
              </div>
            </div>

            {/* Modal Content - Scrollable Location List */}
            <div className="p-4 overflow-y-auto flex-1">
              {(() => {
                const companyLocs = locations.filter(
                  (loc) => String(loc.company_id) === String(viewLocationsCompany.id)
                );

                if (companyLocs.length === 0) {
                  return (
                    <div className="p-8 text-center bg-slate-50/50 rounded-md border border-slate-200/80 my-2">
                      <p className="text-xs text-slate-500 font-normal">
                        No operational locations added for {viewLocationsCompany.company_name} yet.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCompany(viewLocationsCompany);
                          setLocationForm({ company_id: viewLocationsCompany.id, location_name: "" });
                          setIsAddLocationOpen(true);
                        }}
                        className="mt-3 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <span>+</span> Add First Location
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-2 px-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                      <span>Location Name ({companyLocs.length})</span>
                      <span className="pr-2">Status & Actions</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {companyLocs.map((loc) => {
                        const locActive = isStatusActive(loc.status);
                        return (
                          <div
                            key={loc.id}
                            className="flex items-center justify-between p-3 hover:bg-slate-50/70 transition-colors rounded-md"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <span className="text-slate-400 text-sm shrink-0">📍</span>
                              <span className="text-xs font-medium text-slate-900 truncate">
                                {loc.location_name}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {/* Location Active/Inactive Toggle */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={locActive}
                                  title={locActive ? "Deactivate Location" : "Activate Location"}
                                  onClick={() => handleToggleLocationStatus(loc)}
                                  className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-slate-900 ${
                                    locActive ? "bg-slate-900" : "bg-slate-300"
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                      locActive ? "translate-x-3.5" : "translate-x-0"
                                    }`}
                                  />
                                </button>

                              </div>

                              {/* Location Action Buttons */}
                              <div className="flex items-center gap-1 pl-2 border-l border-slate-200/80">
                                <button
                                  type="button"
                                  onClick={() => openEditLocation(loc)}
                                  title="Edit location"
                                  aria-label="Edit location"
                                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer inline-flex items-center justify-center"
                                >
                                  <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openDeleteLocation(loc)}
                                  title="Delete location"
                                  aria-label="Delete location"
                                  className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer inline-flex items-center justify-center"
                                >
                                  <svg className="w-3.5 h-3.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200/80 bg-slate-50/70 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setViewLocationsCompany(null)}
                className="rounded-md border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
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
                  className="px-4 py-1.5 btn-primary text-white rounded-md text-xs font-medium disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
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
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, status: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
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
                  className="px-4 py-1.5 btn-primary text-white rounded-md text-xs font-medium disabled:opacity-50 cursor-pointer"
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
                  className="px-4 py-1.5 btn-primary text-white rounded-md text-xs font-medium disabled:opacity-50 cursor-pointer"
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
                  onChange={(e) => setEditLocationForm({ ...editLocationForm, status: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 font-medium focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
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
                  className="px-4 py-1.5 btn-primary text-white rounded-md text-xs font-medium disabled:opacity-50 cursor-pointer"
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
