const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const getAuthToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token") || "";
  }
  return "";
};

export const dashboardApiService = {
  /**
   * Fetch calculated Admin / Corporate DSA dashboard data
   */
  async getAdminDashboard() {
    const token = getAuthToken();
    if (!token) return { status: false, message: "No auth token found" };

    try {
const res = await fetch(`${API_BASE_URL}/dashboard/admin`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        return {
          status: false,
          message: `Server returned HTTP ${res.status}`,
        };
      }

const json = await res.json().catch(() => null);
      if (!json || !json.status) {
        return {
          status: false,
          message: json?.message || "Failed to load admin dashboard data",
        };
      }

      return json;
    } catch (err) {
      return {
        status: false,
        message: err.message || "Network connection error",
      };
    }
  },

  /**
   * Fetch calculated DSA dashboard data
   */
  async getDsaDashboard() {
    const token = getAuthToken();
    if (!token) return { status: false, message: "No auth token found" };

    try {
      const res = await fetch(`${API_BASE_URL}/dashboard/dsa`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        return {
          status: false,
          message: `Server returned HTTP ${res.status}`,
        };
      }

      const json = await res.json().catch(() => null);
      if (!json || !json.status) {
        return {
          status: false,
          message: json?.message || "Failed to load DSA dashboard data",
        };
      }

      return json;
    } catch (err) {
      return {
        status: false,
        message: err.message || "Network connection error",
      };
    }
  },
};
