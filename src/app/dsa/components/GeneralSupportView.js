"use client";

import React from "react";
import SupportTicketView from "./SupportTicketView";

/**
 * GeneralSupportView
 * Wraps SupportTicketView with category="general" to preserve backward compatibility
 * while fulfilling the General Support ticket flow architecture.
 */
export default function GeneralSupportView({
  onBack = () => {},
  dsaName = "",
  dsaProfile = null,
}) {
  return (
    <SupportTicketView
      category="general"
      onBack={onBack}
      dsaName={dsaName}
      dsaProfile={dsaProfile}
    />
  );
}
