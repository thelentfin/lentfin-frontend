const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const bankApiService = {
  /**
   * Fetch all banks
   * GET /api/bank/list
   */
  async getBanks() {
    try {
      const res = await fetch(`${API_BASE_URL}/bank/list`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      return { status: false, message: err.message || "Failed to fetch banks." };
    }
  },

  /**
   * Fetch single bank by ID
   * GET /api/bank/:id
   */
  async getBankById(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/bank/${id}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      return { status: false, message: err.message || "Failed to fetch bank details." };
    }
  },

  /**
   * Add a new bank
   * POST /api/bank/add
   * Body: { bank_name }
   */
  async addBank(payload) {
    try {
      const res = await fetch(`${API_BASE_URL}/bank/add`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      return { status: false, message: err.message || "Failed to add bank." };
    }
  },

  /**
   * Update an existing bank
   * PUT /api/bank/:id
   * Body: { bank_name, status }
   */
  async updateBank(id, payload) {
    try {
      const res = await fetch(`${API_BASE_URL}/bank/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      return { status: false, message: err.message || "Failed to update bank." };
    }
  },

  /**
   * Delete a bank
   * DELETE /api/bank/:id
   */
  async deleteBank(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/bank/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      return { status: false, message: err.message || "Failed to delete bank." };
    }
  },
};
