const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const productPayoutService = {
  /**
   * Fetch all master products (Admin)
   * GET /api/admin/products
   */
  async getMasterProducts() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/products`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      return await res.json();
    } catch (err) {
      return { status: false, message: err.message || "Failed to fetch products." };
    }
  },

  /**
   * Toggle master product status Active / Inactive
   * PATCH /api/admin/products/:id/status
   */
  async toggleMasterProductStatus(id, status) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/products/${id}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      return await res.json();
    } catch (err) {
      return { status: false, message: err.message || "Failed to update product status." };
    }
  },

  /**
   * Get all product payout configurations for a bank (Admin)
   * GET /api/admin/banks/:bankId/payouts
   */
  async getBankPayouts(bankId) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/banks/${bankId}/payouts`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      return await res.json();
    } catch (err) {
      return { status: false, message: err.message || "Failed to fetch bank payouts." };
    }
  },

  /**
   * Update payout option (rate, status, label, remarks)
   * PATCH /api/admin/payout-options/:id
   */
  async updatePayoutOption(id, payload) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/payout-options/${id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err) {
      return { status: false, message: err.message || "Failed to update payout option." };
    }
  },

  /**
   * Add a new payout option to a bank product
   * POST /api/admin/payout-options/add
   */
  async addPayoutOption(payload) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/payout-options/add`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err) {
      return { status: false, message: err.message || "Failed to add payout option." };
    }
  },

  /**
   * Fetch active products & options for a bank (Customer Application / DSA)
   * GET /api/banks/:bankId/products
   */
  async getActiveBankProducts(bankId) {
    try {
      const res = await fetch(`${API_BASE_URL}/banks/${bankId}/products`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      return await res.json();
    } catch (err) {
      return { status: false, message: err.message || "Failed to load bank products." };
    }
  },
};
