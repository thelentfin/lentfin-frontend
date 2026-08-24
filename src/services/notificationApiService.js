const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const getAuthToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token") || "";
  }
  return "";
};

export const notificationApiService = {
  /**
   * Fetch notification list for current user
   */
  async getNotifications() {
    const token = getAuthToken();
    if (!token) return { status: false, data: [] };

    try {
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        return { status: false, data: [], message: `Server returned HTTP ${res.status}` };
      }

      const json = await res.json().catch(() => null);
      if (!json || !json.status) {
        return { status: false, data: [], message: json?.message || "Failed to load notifications" };
      }

      return json;
    } catch (err) {
      return { status: false, data: [], message: err.message || "Network connection error" };
    }
  },

  /**
   * Fetch unread notification count
   */
  async getUnreadCount() {
    const token = getAuthToken();
    if (!token) return 0;

    try {
      const res = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) return 0;

      const json = await res.json().catch(() => null);
      if (json && json.status && typeof json.unread_count === "number") {
        return json.unread_count;
      }
      return 0;
    } catch (err) {
      return 0;
    }
  },

  /**
   * Mark single notification as read
   */
  async markAsRead(notificationId) {
    const token = getAuthToken();
    if (!token || !notificationId) return false;

    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) return false;
      const json = await res.json().catch(() => null);
      return json?.status === true;
    } catch (err) {
      return false;
    }
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) return false;
      const json = await res.json().catch(() => null);
      return json?.status === true;
    } catch (err) {
      return false;
    }
  },

  /**
   * Delete all read notifications for current user
   */
  async deleteAllRead() {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const res = await fetch(`${API_BASE_URL}/notifications/all`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) return false;
      const json = await res.json().catch(() => null);
      return json?.status === true;
    } catch (err) {
      return false;
    }
  },
};

/**
 * Format timestamp into relative human-readable string
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return "Just now";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 30) return "Just now";
    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) {
      const mins = Math.floor(diffInSeconds / 60);
      return `${mins} ${mins === 1 ? "min" : "mins"} ago`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    }
    if (diffInSeconds < 172800) return "Yesterday";

    const days = Math.floor(diffInSeconds / 86400);
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch (e) {
    return "Recently";
  }
}
