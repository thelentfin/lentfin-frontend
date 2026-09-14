const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const getAuthToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token") || "";
  }
  return "";
};

export const supportTicketService = {
  /**
   * Create a support ticket on the backend
   * @param {FormData} formData - Must contain case_id, issue_type, description, and optional attachments
   * @returns {Promise<{ status: boolean, message?: string, data?: any, error?: string }>}
   */
  async createTicket(formData) {
    const token = getAuthToken();
    if (!token) {
      return {
        status: false,
        message: "Authentication token not found. Please log in again.",
      };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/support-ticket/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Note: Do NOT set Content-Type header manually for FormData
          // Browser will automatically set boundary
        },
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data || !data.status) {
        return {
          status: false,
          message:
            data?.message ||
            `Failed to create support ticket (HTTP ${response.status}).`,
          data: data?.data,
          existing_ticket: data?.existing_ticket,
        };
      }

      return data;
    } catch (err) {
      return {
        status: false,
        message:
          err.message || "Network error while connecting to support service.",
      };
    }
  },

  /**
   * Fetch all support tickets for Admin / Corporate DSA
   * @returns {Promise<{ status: boolean, message?: string, count?: number, data?: any[] }>}
   */
  async getAllTickets() {
    const token = getAuthToken();
    if (!token) {
      return {
        status: false,
        message: "Authentication token not found. Please log in again.",
        data: [],
      };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/support-ticket/all`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data || !data.status) {
        return {
          status: false,
          message:
            data?.message ||
            `Failed to fetch support tickets (HTTP ${response.status}).`,
          data: [],
        };
      }

      return data;
    } catch (err) {
      return {
        status: false,
        message:
          err.message || "Network error while connecting to support service.",
        data: [],
      };
    }
  },

  /**
   * Resolve a support ticket (Admin / Corporate DSA)
   * @param {number|string} ticketId - ID of the ticket to resolve
   * @param {string} closedReason - Reason for resolving / closing ticket
   * @returns {Promise<{ status: boolean, message?: string, data?: any }>}
   */
  async resolveTicket(ticketId, closedReason) {
    const token = getAuthToken();
    if (!token) {
      return {
        status: false,
        message: "Authentication token not found. Please log in again.",
      };
    }

    if (!ticketId) {
      return {
        status: false,
        message: "Invalid ticket ID.",
      };
    }

    if (!closedReason || !closedReason.trim()) {
      return {
        status: false,
        message: "Resolution reason is required.",
      };
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/support-ticket/${ticketId}/resolve`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            closed_reason: closedReason.trim(),
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok || !data || !data.status) {
        return {
          status: false,
          message:
            data?.message ||
            `Failed to resolve support ticket (HTTP ${response.status}).`,
          data: data?.data,
        };
      }

      return data;
    } catch (err) {
      return {
        status: false,
        message:
          err.message || "Network error while connecting to support service.",
      };
    }
  },
};

