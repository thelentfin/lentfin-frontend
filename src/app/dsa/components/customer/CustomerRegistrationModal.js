"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  fullCustomerRegistrationSchema,
  getFileFromVal,
} from "@/schemas/customerRegistrationSchema";
import { customerApiService } from "@/services/customerApiService";
import { bankApiService } from "@/services/bankApiService";
import { companyLocationService } from "@/services/companyLocationService";
import { productPayoutService } from "@/services/productPayoutService";
import CustomerStep2 from "./CustomerStep2";
import CustomerStep3 from "./CustomerStep3";
import CarLoanStep2 from "./CarLoanStep2";
import StandardStep2Customer from "./StandardStep2Customer";
import SaasSelect from "@/components/SaasSelect";

const DEFAULT_MASTER_PRODUCTS = [
  { id: 1, product_name: "HOME LOAN (HL)" },
  { id: 2, product_name: "Affordable Housing" },
  { id: 3, product_name: "LOAN AGAINST PROPERTY (LAP)" },
  { id: 4, product_name: "Loan Against Credit Card (LACR)" },
  { id: 5, product_name: "SME" },
  { id: 6, product_name: "DOD/OD" },
  { id: 7, product_name: "Credit Card/ Swipe Machine" },
  { id: 8, product_name: "Plant & Machinery" },
  { id: 9, product_name: "Education Loan" },
  { id: 10, product_name: "Machinery Loan" },
  { id: 11, product_name: "MSME" },
  { id: 12, product_name: "Working Capital / OD" },
  { id: 13, product_name: "Secured Term Loan" },
  { id: 14, product_name: "Gold Loan" },
  { id: 16, product_name: "Car Loan" },
];

export default function CustomerRegistrationModal({
  isOpen,
  onClose,
  onSuccess,
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [fetchedBanks, setFetchedBanks] = useState([]);
  const [isBanksLoading, setIsBanksLoading] = useState(false);
  const [banksError, setBanksError] = useState("");
  const [fetchedCompanies, setFetchedCompanies] = useState([]);
  const [isCompaniesLoading, setIsCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState("");
  const [masterProducts, setMasterProducts] = useState(DEFAULT_MASTER_PRODUCTS);
  const [bankProducts, setBankProducts] = useState([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [activeBankRatesForProduct, setActiveBankRatesForProduct] = useState(null);
  const [isBankRatesLoading, setIsBankRatesLoading] = useState(false);
  const [fetchedReferrals, setFetchedReferrals] = useState([]);
  const [isReferralsLoading, setIsReferralsLoading] = useState(false);
  const [showReferralInfo, setShowReferralInfo] = useState(false);
  const referralInfoRef = useRef(null);

  // Click-outside listener for referral attribution info popover
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (referralInfoRef.current && !referralInfoRef.current.contains(e.target)) {
        setShowReferralInfo(false);
      }
    };
    if (showReferralInfo) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showReferralInfo]);

  // Fetch active banks from Bank Master API on modal open
  const loadActiveBanks = async () => {
    setIsBanksLoading(true);
    setBanksError("");
    const res = await bankApiService.getBanks();
    if (res && res.status && Array.isArray(res.data)) {
      // Filter ONLY Active banks for new customer applications
      const activeBanks = res.data.filter(
        (b) => String(b.status || "").toLowerCase() === "active"
      );
      setFetchedBanks(activeBanks);
    } else {
      setBanksError(res?.message || "Failed to load bank options.");
      setFetchedBanks([]);
    }
    setIsBanksLoading(false);
  };

  // Fetch active corporate companies from Company API on modal open
  const loadActiveCompanies = async () => {
    setIsCompaniesLoading(true);
    setCompaniesError("");
    try {
      const res = await companyLocationService.getCompanies();
      if (res && res.status && Array.isArray(res.data)) {
        // Filter ONLY Active companies
        const activeCompanies = res.data.filter(
          (c) => !c.status || String(c.status).toLowerCase() === "active"
        );
        setFetchedCompanies(activeCompanies);
      } else {
        setCompaniesError(res?.message || "Failed to load company options.");
        setFetchedCompanies([]);
      }
    } catch (err) {
      setCompaniesError(err.message || "Failed to load company options.");
      setFetchedCompanies([]);
    } finally {
      setIsCompaniesLoading(false);
    }
  };

  // Fetch active referral agents (sub-DSAs) under current Master DSA
  const loadReferrals = async () => {
    setIsReferralsLoading(true);
    try {
      const res = await customerApiService.fetchMyReferrals();
      setFetchedReferrals(Array.isArray(res) ? res : []);
    } catch (err) {
      setFetchedReferrals([]);
    } finally {
      setIsReferralsLoading(false);
    }
  };

  // Fetch active products from Master Products or fallback
  const loadActiveProducts = async () => {
    setIsProductsLoading(true);
    setProductsError("");
    try {
      const res = await productPayoutService.getMasterProducts();
      if (res && res.status && Array.isArray(res.data) && res.data.length > 0) {
        const activeProds = res.data.filter(
          (p) => !p.status || String(p.status).toLowerCase() === "active"
        );
        const hasCar = activeProds.some((p) =>
          p.product_name?.toLowerCase().includes("car")
        );
        if (!hasCar) {
          activeProds.push({ id: 16, product_name: "Car Loan" });
        }
        setMasterProducts(activeProds);
      } else {
        setMasterProducts(DEFAULT_MASTER_PRODUCTS);
      }
    } catch (err) {
      setMasterProducts(DEFAULT_MASTER_PRODUCTS);
    } finally {
      setIsProductsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadActiveBanks();
      loadActiveCompanies();
      loadReferrals();
      loadActiveProducts();
    }
  }, [isOpen]);

  // Single React Hook Form instance for all steps with complete Zod resolver
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    clearErrors,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(fullCustomerRegistrationSchema),
    mode: "onTouched",
    defaultValues: {
      // Step 1
      company: "",
      subDsaId: "",
      bank: "",
      product: "",
      payoutOption: "",
      customerName: "",
      mobile: "",
      applicationNo: "",
      loanAccountNo: "",
      sanctionAmount: "",
      sanctionLetter: null,
      // Car Loan fields
      isCarLoan: false,
      carPhotos: [],
      invoiceCopy: null,
      insuranceCopy: null,
      paymentAdvice: null,
      bankerName: "",
      bankerMobile: "",
      // Step 3 (Disbursement)
      disbursementType: "Full",
      disbursementAmount: "",
      disbursementDate: "",
      rate: "",
      pf: "",
      tenure: "",
      insuranceAmount: "",
      chequeHandoverDate: "",
      pddCleared: "no",
      // Step 4 (SM/ASM & Payment)
      smName: "",
      smMobile: "",
      smEmail: "",
      asmName: "",
      asmMobile: "",
      asmEmail: "",
      paymentType: "",
      subDsaPercentage: "",
    },
  });

  const selectedSanctionLetter = watch("sanctionLetter");
  const sanctionFile = getFileFromVal(selectedSanctionLetter);

  const watchedBank = watch("bank");
  const watchedProduct = watch("product");
  const watchedPayoutOption = watch("payoutOption");
  const watchedSanctionAmount = watch("sanctionAmount");
  const watchedSubDsaId = watch("subDsaId");

  const selectedSubDsaObj = useMemo(() => {
    if (!watchedSubDsaId) return null;
    return fetchedReferrals.find((r) => String(r.id) === String(watchedSubDsaId)) || null;
  }, [watchedSubDsaId, fetchedReferrals]);

  const watchedCompany = watch("company");

  const selectedCompanyObj = useMemo(() => {
    if (!watchedCompany || !Array.isArray(fetchedCompanies)) return null;
    return (
      fetchedCompanies.find(
        (c) => String(c.id) === String(watchedCompany)
      ) || null
    );
  }, [watchedCompany, fetchedCompanies]);

  // Resolve currently selected master product
  const selectedProductObj = useMemo(() => {
    if (!watchedProduct) return null;
    return (
      masterProducts.find(
        (p) =>
          String(p.id) === String(watchedProduct) ||
          String(p.product_id) === String(watchedProduct)
      ) || null
    );
  }, [watchedProduct, masterProducts]);

  // Detect whether currently selected product is a Car Loan
  const isCarLoan = useMemo(() => {
    if (!selectedProductObj?.product_name) return false;
    return selectedProductObj.product_name.toLowerCase().includes("car");
  }, [selectedProductObj]);

  const totalSteps = isCarLoan ? 2 : 4;

  useEffect(() => {
    setValue("isCarLoan", isCarLoan);
  }, [isCarLoan, setValue]);

  // When Loan Product changes: reset bank & payout option, and fetch active bank list
  useEffect(() => {
    setValue("bank", "");
    setValue("payoutOption", "");
    setBankProducts([]);
    setActiveBankRatesForProduct(null);

    if (!watchedProduct) {
      return;
    }

    let isMounted = true;
    const fetchRates = async () => {
      setIsBankRatesLoading(true);
      try {
        const res = await productPayoutService.getProductBankRates(watchedProduct);
        if (isMounted) {
          if (res && res.status && Array.isArray(res.data)) {
            // Strictly include ONLY banks that are Active AND have at least one Active option for this product
            const activeBankIds = new Set(
              res.data
                .filter(
                  (b) =>
                    b.has_active_option === true &&
                    String(b.bank_status || "").toLowerCase() === "active"
                )
                .map((b) => String(b.bank_id))
            );
            setActiveBankRatesForProduct(activeBankIds);
          } else {
            setActiveBankRatesForProduct(new Set());
          }
        }
      } catch (e) {
        if (isMounted) setActiveBankRatesForProduct(new Set());
      } finally {
        if (isMounted) setIsBankRatesLoading(false);
      }
    };

    fetchRates();

    return () => {
      isMounted = false;
    };
  }, [watchedProduct, setValue]);

  // Filtered active banks based on selected loan product
  const displayedBanks = useMemo(() => {
    if (!watchedProduct) {
      return [];
    }
    // While loading or before fetch completes
    if (activeBankRatesForProduct === null) {
      return [];
    }
    // If Car Loan and no bank-specific rates configured in DB yet, show active master banks
    if (isCarLoan && activeBankRatesForProduct.size === 0) {
      return fetchedBanks;
    }
    // Strictly show ONLY active banks that have active payout options for this product
    return fetchedBanks.filter((b) =>
      activeBankRatesForProduct.has(String(b.id))
    );
  }, [watchedProduct, isCarLoan, activeBankRatesForProduct, fetchedBanks]);

  // Once both Bank and Product are selected, fetch that bank's payout options/slabs
  useEffect(() => {
    if (!watchedBank || !watchedProduct) {
      setBankProducts([]);
      setValue("payoutOption", "");
      return;
    }

    let isMounted = true;
    const fetchProductsForBank = async () => {
      setIsProductsLoading(true);
      setProductsError("");
      const res = await productPayoutService.getActiveBankProducts(watchedBank);
      if (isMounted) {
        if (res && res.status && Array.isArray(res.data)) {
          setBankProducts(res.data);
          const matchedProd = res.data.find(
            (p) =>
              String(p.product_id) === String(watchedProduct) ||
              p.product_name?.toLowerCase() ===
                selectedProductObj?.product_name?.toLowerCase()
          );
          if (matchedProd && matchedProd.options && matchedProd.options.length === 1) {
            setValue("payoutOption", String(matchedProd.options[0].id), {
              shouldValidate: true,
            });
          }
        } else {
          setBankProducts([]);
        }
        setIsProductsLoading(false);
      }
    };

    fetchProductsForBank();

    return () => {
      isMounted = false;
    };
  }, [watchedBank, watchedProduct, selectedProductObj, setValue]);

  // Resolve currently selected bank product details & slabs
  const currentProductObj = useMemo(() => {
    if (!bankProducts || bankProducts.length === 0) return null;
    return (
      bankProducts.find(
        (p) =>
          String(p.product_id) === String(watchedProduct) ||
          p.product_name?.toLowerCase() ===
            selectedProductObj?.product_name?.toLowerCase()
      ) || null
    );
  }, [bankProducts, watchedProduct, selectedProductObj]);

  const selectedOptionObj = useMemo(() => {
    if (!currentProductObj?.options) return null;
    return (
      currentProductObj.options.find(
        (o) => String(o.id) === String(watchedPayoutOption)
      ) || null
    );
  }, [currentProductObj, watchedPayoutOption]);

  const [isDraggingSanction, setIsDraggingSanction] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setValue("sanctionLetter", files[0], {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
      if (errors.sanctionLetter) {
        clearErrors("sanctionLetter");
      }
    }
  };

  const handleSanctionDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingSanction) setIsDraggingSanction(true);
  };

  const handleSanctionDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSanction(false);
  };

  const handleSanctionDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSanction(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      setValue("sanctionLetter", files[0], {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
      if (errors.sanctionLetter) {
        clearErrors("sanctionLetter");
      }
    }
  };

  const handleRemoveFile = (e) => {
    if (e) e.stopPropagation();
    setValue("sanctionLetter", null, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  // Validate Step 1 fields (Corporate, Referral, Product, Bank) before advancing
  const handleNextStep1 = async () => {
    setSubmitError(null);
    const fieldsToValidate = ["company", "product", "bank"];
    if (currentProductObj && currentProductObj.options && currentProductObj.options.length > 1) {
      fieldsToValidate.push("payoutOption");
    }
    const isStep1Valid = await trigger(fieldsToValidate);

    if (isStep1Valid) {
      setCurrentStep(2);
    }
  };

  // Validate Step 2 fields before advancing (for Standard Loan)
  const handleNextStep2 = async () => {
    setSubmitError(null);
    const isStep2Valid = await trigger([
      "customerName",
      "applicationNo",
      "loanAccountNo",
      "sanctionAmount",
      "sanctionLetter",
    ]);

    if (isStep2Valid) {
      setCurrentStep(3);
    }
  };

  // Validate Step 3 fields before advancing (for Standard Loan)
  const handleNextStep3 = async () => {
    setSubmitError(null);
    const isStep3Valid = await trigger([
      "disbursementType",
      "disbursementAmount",
      "disbursementDate",
      "rate",
      "pf",
      "tenure",
      "insuranceAmount",
      "chequeHandoverDate",
      "pddCleared",
    ]);

    if (isStep3Valid) {
      setCurrentStep(4);
    }
  };

  // Called when RHF full-form validation succeeds
  const onFinalSubmit = async (formData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Execute sequential API calls (stops immediately if any request fails)
      await customerApiService.submitFullCustomerRegistration(
        formData,
        fetchedBanks,
        fetchedCompanies
      );

      // Success sequence
      setSubmittedData(formData);
      setIsSubmittedSuccess(true);
      setIsSubmitting(false);
      toast.success("Customer application registered successfully!");
      if (typeof onSuccess === "function") {
        onSuccess(formData);
      }
    } catch (err) {
      // Preserves form data and keeps modal open on API failure
      setIsSubmitting(false);
      const errMsg = err.message || "Failed to submit application to server. Please try again.";
      setSubmitError(errMsg);
      toast.error(errMsg);
    }
  };

  // Called when RHF full-form validation fails before any API call is made
  const onInvalid = (formErrors) => {
    setSubmitError("Please fill in all required fields accurately across all steps.");
    
    // Auto-navigate to the step that has validation errors
    const step1Fields = ["company", "product", "bank", "payoutOption"];
    const standardStep2Fields = [
      "customerName",
      "applicationNo",
      "loanAccountNo",
      "sanctionAmount",
      "sanctionLetter",
    ];
    const carLoanStep2Fields = [
      "customerName",
      "mobile",
      "carPhotos",
      "invoiceCopy",
      "insuranceCopy",
      "paymentAdvice",
      "bankerName",
      "bankerMobile",
    ];
    const step3Fields = [
      "disbursementType",
      "disbursementAmount",
      "disbursementDate",
      "rate",
      "pf",
      "tenure",
      "insuranceAmount",
      "chequeHandoverDate",
      "pddCleared",
    ];

    const hasStep1Error = step1Fields.some((field) => formErrors[field]);
    const hasStep2Error = (isCarLoan ? carLoanStep2Fields : standardStep2Fields).some(
      (field) => formErrors[field]
    );
    const hasStep3Error = !isCarLoan && step3Fields.some((field) => formErrors[field]);

    if (hasStep1Error) {
      setCurrentStep(1);
    } else if (hasStep2Error) {
      setCurrentStep(2);
    } else if (hasStep3Error) {
      setCurrentStep(3);
    } else {
      setCurrentStep(isCarLoan ? 2 : 4);
    }
  };

  const handleCloseModal = () => {
    if (isSubmitting) return; // Prevent closing while API submission is in progress
    reset();
    setCurrentStep(1);
    setIsSubmittedSuccess(false);
    setSubmittedData(null);
    setSubmitError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div
        className={`relative w-full flex flex-col rounded-xl bg-white border border-slate-200/80 shadow-xl transition-all duration-200 ${
          isSubmittedSuccess
            ? "max-w-lg h-auto overflow-hidden"
            : currentStep === 1
            ? "max-w-3xl h-auto overflow-visible"
            : "max-w-3xl h-[640px] max-h-[92vh] overflow-hidden"
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 sm:px-6 py-4 bg-white shrink-0 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 leading-tight">
                {isSubmittedSuccess
                  ? "Application Status"
                  : isCarLoan
                  ? "New Car Loan Application"
                  : "New Customer Application"}
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                {isSubmittedSuccess
                  ? "Application received and queued for review"
                  : `Step ${currentStep} of ${totalSteps} — ${
                      currentStep === 1
                        ? "Corporate, Product & Bank"
                        : currentStep === 2
                        ? isCarLoan
                          ? "Vehicle & Document Details"
                          : "Customer & Sanction Details"
                        : currentStep === 3
                        ? "Disbursement Details"
                        : "Payment & Contact Details"
                    }`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseModal}
            disabled={isSubmitting}
            className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer text-sm disabled:opacity-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div
          className={`bg-slate-50/50 ${
            isSubmittedSuccess
              ? "p-4 sm:p-5 overflow-visible"
              : currentStep === 1
              ? "p-5 sm:p-6 relative z-20 overflow-visible"
              : "p-5 sm:p-6 flex-1 overflow-y-auto custom-scrollbar"
          }`}
        >
          {/* Submission / Validation Error Banner */}
          {submitError && (
            <div className="mb-5 p-3.5 rounded-md bg-red-50 border border-red-200/80 text-red-700 text-xs font-medium flex items-start gap-2.5">
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-red-100 text-red-600 font-bold text-[10px] shrink-0 mt-0.5">
                !
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-900">Submission Alert</p>
                <p className="mt-0.5">{submitError}</p>
              </div>
            </div>
          )}

          {isSubmittedSuccess ? (
            /* Backend Submission Success Card (Rich, Content-fit, Reassuring) */
            <div className="py-1 px-0.5 text-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
              {/* Luminous Green Success Badge */}
              <div className="relative mx-auto w-14 h-14 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-emerald-100/80 animate-ping opacity-20"></div>
                <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              {/* Title & Under Admin Review Badge */}
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900 tracking-tight">
                  Application Submitted Successfully!
                </h4>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 border border-amber-200/90 text-amber-800 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>Under Admin Review &amp; Verification</span>
                </div>
              </div>

              {/* Structured Application Summary Box */}
              <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs text-left space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Application Summary
                  </span>
                  <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/50">
                    Logged
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-medium">Customer</span>
                    <span className="font-semibold text-slate-900 truncate block text-xs">
                      {submittedData?.customerName || "Customer Lead"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-medium">Product &amp; Bank</span>
                    <span className="font-semibold text-slate-900 truncate block text-xs">
                      {masterProducts.find((p) => String(p.id) === String(submittedData?.product))?.product_name ||
                        (isCarLoan ? "Car Loan" : "Loan")}
                      {" • "}
                      {fetchedBanks.find((b) => String(b.id) === String(submittedData?.bank))?.bank_name || "Bank"}
                    </span>
                  </div>

                  {submittedData?.loanAmount && (
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-medium">Loan Amount</span>
                      <span className="font-semibold text-slate-900 block text-xs">
                        ₹{Number(submittedData.loanAmount).toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-medium">Submitted On</span>
                    <span className="font-semibold text-slate-900 block text-xs">
                      {new Date().toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Next Steps Visual Indicator */}
              <div className="grid grid-cols-2 gap-2 text-left">
                <div className="p-2 rounded-xl bg-emerald-50/80 border border-emerald-200/60 flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                    ✓
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-emerald-950 truncate">Application Logged</p>
                    <p className="text-[9px] text-emerald-700 truncate">Saved to system</p>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-purple-50/80 border border-purple-200/60 flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#B063FF] text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                    ⏳
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-purple-950 truncate">Admin Review</p>
                    <p className="text-[9px] text-purple-700 truncate">Verification queued</p>
                  </div>
                </div>
              </div>

              {/* Informative Reassurance Callout */}
              <div className="p-2.5 rounded-xl bg-slate-100/80 border border-slate-200/80 text-left text-xs text-slate-600 flex items-start gap-2">
                <svg className="w-3.5 h-3.5 text-[#B063FF] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[10.5px] leading-relaxed text-slate-600">
                  The corporate admin team has been notified for document verification. You can track sanction status, disbursals, and payout commission directly from your applications list.
                </p>
              </div>

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-full py-2.5 px-4 rounded-xl btn-primary text-white text-xs font-semibold hover:opacity-95 transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Done &amp; Close</span>
              </button>
            </div>
          ) : (
            <form
              id="customer-registration-form"
              onSubmit={handleSubmit(onFinalSubmit, onInvalid)}
            >
              {/* STEP 1 */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 1. Corporate Company Selection */}
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600">
                        Corporate Company <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          {...register("company")}
                          disabled={isSubmitting || isCompaniesLoading}
                          className={`w-full appearance-none rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none transition-colors cursor-pointer ${
                            errors.company
                              ? "border-red-400 focus:border-red-500"
                              : "border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                          }`}
                        >
                          {isCompaniesLoading ? (
                            <option value="">Loading companies...</option>
                          ) : companiesError ? (
                            <option value="">Failed to load companies</option>
                          ) : fetchedCompanies.length === 0 ? (
                            <option value="">No companies available</option>
                          ) : (
                            <>
                              <option value="">Select Corporate Company</option>
                              {fetchedCompanies.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.company_name}
                                </option>
                              ))}
                            </>
                          )}
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {companiesError && (
                        <p className="text-[11px] font-medium text-red-500 mt-1 flex items-center justify-between">
                          <span>⚠️ {companiesError}</span>
                          <button
                            type="button"
                            onClick={loadActiveCompanies}
                            className="underline cursor-pointer text-slate-900 ml-2"
                          >
                            Retry
                          </button>
                        </p>
                      )}
                      {errors.company && (
                        <p className="text-[11px] font-medium text-red-500">{errors.company.message}</p>
                      )}
                    </div>

                    {/* 2. Referral Agent / Lead Attribution Dropdown */}
                    <div className="space-y-1 relative" ref={referralInfoRef}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <label className="block text-xs font-medium text-slate-600">
                            Lead Attribution / Referral Agent
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowReferralInfo((prev) => !prev)}
                            title="What is Referral Agent Attribution?"
                            aria-label="What is Referral Agent Attribution?"
                            className={`p-0.5 rounded-full transition-all cursor-pointer flex items-center justify-center focus:outline-none ${
                              showReferralInfo
                                ? "text-purple-600 bg-purple-50 ring-2 ring-purple-200"
                                : "text-slate-400 hover:text-purple-600 hover:bg-slate-100"
                            }`}
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.8}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="16" x2="12" y2="12" />
                              <line x1="12" y1="8" x2="12.01" y2="8" strokeWidth={2.4} />
                            </svg>
                          </button>
                        </div>

                        {watchedSubDsaId && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 leading-none">
                            <span>✓</span> Attributed
                          </span>
                        )}
                      </div>

                      {/* Informative Popover */}
                      {showReferralInfo && (
                        <div className="absolute right-0 top-7 z-50 w-80 max-w-[calc(100vw-3rem)] p-3.5 bg-slate-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl text-left border border-slate-800 animate-in fade-in zoom-in-95 duration-150 space-y-2.5">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20 text-[#B063FF] text-[11px] font-bold">
                                ⓘ
                              </span>
                              <span className="text-xs font-semibold text-slate-100 tracking-tight">
                                How Lead Attribution Works
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowReferralInfo(false)}
                              className="text-slate-400 hover:text-white text-xs leading-none cursor-pointer p-1 rounded-md hover:bg-slate-800 transition-colors"
                              aria-label="Close"
                            >
                              ✕
                            </button>
                          </div>

                          <div className="rounded-lg bg-slate-800/60 p-2.5 border border-slate-700/60 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                                Direct Application (Self)
                              </span>
                              <span className="text-[10px] text-emerald-300 font-mono bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-800/40">
                                100% Payout
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-normal">
                              Default for your self-sourced clients. All bank payout commissions stay 100% with your Master DSA account.
                            </p>
                          </div>

                          <div className="rounded-lg bg-slate-800/60 p-2.5 border border-slate-700/60 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-purple-300 flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-purple-400"></span>
                                Referral Partner / Connector
                              </span>
                              <span className="text-[10px] text-purple-300 font-mono bg-purple-950/70 px-1.5 py-0.5 rounded border border-purple-800/40">
                                Split Commission
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-normal">
                              Select the sub-agent who sourced this customer. They get view-only tracking in their dashboard, while you set their commission share and keep the overriding margin.
                            </p>
                          </div>

                          <div className="pt-0.5 flex items-center justify-between text-[10px] text-slate-400">
                            <span className="flex items-center gap-1 text-slate-400">
                              ⚡ Automated ledger & commission split
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowReferralInfo(false)}
                              className="text-purple-300 hover:text-white font-medium cursor-pointer transition-colors"
                            >
                              Got it
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="relative">
                        <select
                          {...register("subDsaId")}
                          disabled={isSubmitting || isReferralsLoading}
                          className="w-full appearance-none rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none transition-colors cursor-pointer focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                        >
                          <option value="">Direct Application (Self / No Referral Agent)</option>
                          {fetchedReferrals.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} {r.dsa_code ? `(${r.dsa_code})` : ""} {r.mobile ? `— ${r.mobile}` : ""}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* 3. Loan Product Selection (Selected FIRST before Bank) */}
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600">
                        Loan Product <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          {...register("product")}
                          disabled={isSubmitting || isProductsLoading}
                          className={`w-full appearance-none rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none transition-colors cursor-pointer ${
                            errors.product
                              ? "border-red-400 focus:border-red-500"
                              : "border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                          }`}
                        >
                          <option value="">Select Loan Product</option>
                          {masterProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.product_name}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {errors.product && (
                        <p className="text-[11px] font-medium text-red-500">{errors.product.message}</p>
                      )}
                    </div>

                    {/* 4. Bank Selection (Searchable & Filtered for Selected Product) */}
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600">
                        Bank Name <span className="text-red-500">*</span>
                      </label>
                      <input type="hidden" {...register("bank")} />
                      <SaasSelect
                        options={displayedBanks.map((b) => ({
                          value: String(b.id),
                          label: b.bank_name,
                        }))}
                        value={watchedBank ? String(watchedBank) : ""}
                        onChange={(val) => {
                          setValue("bank", val, {
                            shouldValidate: true,
                            shouldDirty: true,
                            shouldTouch: true,
                          });
                          if (errors.bank) {
                            clearErrors("bank");
                          }
                        }}
                        placeholder={
                          !watchedProduct
                            ? "Select Loan Product first..."
                            : isBankRatesLoading
                            ? "Loading active banks for this product..."
                            : displayedBanks.length === 0
                            ? "No banks available for this product"
                            : `Search or select bank (${displayedBanks.length} available)...`
                        }
                        searchable={true}
                        searchPlaceholder="Type to search banks..."
                        disabled={
                          isSubmitting ||
                          !watchedProduct ||
                          isBankRatesLoading ||
                          displayedBanks.length === 0
                        }
                        hasError={!!errors.bank}
                      />
                      {errors.bank && (
                        <p className="text-[11px] font-medium text-red-500">{errors.bank.message}</p>
                      )}
                    </div>

                    {/* 5. Product Variant / Slab Selection (Appears once Bank & Product selected) */}
                    {currentProductObj && currentProductObj.options && currentProductObj.options.length > 0 && (
                      <div className="space-y-1 md:col-span-2">
                        <label className="block text-xs font-medium text-slate-600">
                          Product Variant / Slab <span className="text-red-500">*</span>
                        </label>
                        {currentProductObj.options.length > 1 ? (
                          <div className="relative">
                            <select
                              {...register("payoutOption")}
                              disabled={isSubmitting}
                              className={`w-full appearance-none rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none transition-colors cursor-pointer ${
                                errors.payoutOption
                                  ? "border-red-400 focus:border-red-500"
                                  : "border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                              }`}
                            >
                              <option value="">Select Product Variant / Slab</option>
                              {currentProductObj.options.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.option_label} — {Number(opt.payout_percentage).toFixed(2)}%
                                </option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <div className="px-3 py-2 rounded-md bg-purple-50 border border-purple-200/80 flex items-center justify-between text-xs text-purple-900">
                            <span className="font-semibold">
                              {currentProductObj.options[0]?.option_label || "Standard"}
                            </span>
                            <span className="font-mono font-bold text-purple-700">
                              {Number(currentProductObj.options[0]?.payout_percentage || 0).toFixed(2)}%
                            </span>
                          </div>
                        )}
                        {errors.payoutOption && (
                          <p className="text-[11px] font-medium text-red-500">
                            {errors.payoutOption.message}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {currentStep === 2 && (
                isCarLoan ? (
                  <CarLoanStep2
                    register={register}
                    errors={errors}
                    control={control}
                    setValue={setValue}
                    clearErrors={clearErrors}
                    disabled={isSubmitting}
                  />
                ) : (
                  <StandardStep2Customer
                    register={register}
                    errors={errors}
                    control={control}
                    watch={watch}
                    setValue={setValue}
                    clearErrors={clearErrors}
                    disabled={isSubmitting}
                    selectedPayoutOption={selectedOptionObj}
                    isDraggingSanction={isDraggingSanction}
                    handleSanctionDragOver={handleSanctionDragOver}
                    handleSanctionDragLeave={handleSanctionDragLeave}
                    handleSanctionDrop={handleSanctionDrop}
                    handleRemoveFile={handleRemoveFile}
                  />
                )
              )}

              {/* STEP 3 (Standard Loan Only) */}
              {currentStep === 3 && !isCarLoan && (
                <CustomerStep2
                  register={register}
                  errors={errors}
                  watch={watch}
                  setValue={setValue}
                  clearErrors={clearErrors}
                  control={control}
                  disabled={isSubmitting}
                  selectedPayoutOption={selectedOptionObj}
                  sanctionAmount={watchedSanctionAmount}
                />
              )}

              {/* STEP 4 (Standard Loan Only) */}
              {currentStep === 4 && !isCarLoan && (
                <CustomerStep3
                  register={register}
                  errors={errors}
                  watch={watch}
                  setValue={setValue}
                  trigger={trigger}
                  control={control}
                  disabled={isSubmitting}
                  selectedCompany={selectedCompanyObj}
                  selectedSubDsa={
                    selectedSubDsaObj ||
                    (watchedSubDsaId
                      ? { id: watchedSubDsaId, name: "Referral Partner" }
                      : null)
                  }
                  disbursedAmount={
                    watch("disbursementType") === "Part"
                      ? watch("disbursementAmount")
                      : watchedSanctionAmount
                  }
                />
              )}
            </form>
          )}
        </div>

        {/* Modal Footer */}
        {!isSubmittedSuccess && (
          <div className="relative z-10 flex items-center justify-between border-t border-slate-200/80 px-5 sm:px-6 py-3.5 bg-slate-50/50 shrink-0 rounded-b-xl">
            <div className="text-xs font-medium text-slate-500">
              Step {currentStep} of {totalSteps}
            </div>

            <div className="flex items-center gap-2">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Previous
                </button>
              )}

              {currentStep === 1 && (
                <button
                  type="button"
                  onClick={handleNextStep1}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1 px-4 py-1.5 rounded-md btn-primary text-xs font-medium text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  Next
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              {currentStep === 2 && !isCarLoan && (
                <button
                  type="button"
                  onClick={handleNextStep2}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1 px-4 py-1.5 rounded-md btn-primary text-xs font-medium text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  Next
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              {currentStep === 2 && isCarLoan && (
                <button
                  type="submit"
                  form="customer-registration-form"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md btn-primary text-xs font-medium text-white transition-colors cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Submitting Car Loan...
                    </>
                  ) : (
                    <>
                      Submit Car Loan Application
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>
              )}

              {currentStep === 3 && (
                <button
                  type="button"
                  onClick={handleNextStep3}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1 px-4 py-1.5 rounded-md btn-primary text-xs font-medium text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  Next
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              {currentStep === 4 && (
                <button
                  type="submit"
                  form="customer-registration-form"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md btn-primary text-xs font-medium text-white transition-colors cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Submitting Application...
                    </>
                  ) : (
                    <>
                      Submit Application
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
