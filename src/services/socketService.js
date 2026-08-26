import { io } from "socket.io-client";

const getSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  return apiUrl.replace(/\/api\/?$/, "");
};

let socketInstance = null;

export const socketService = {
  /**
   * Get or initialize singleton Socket.IO connection
   */
  getSocket() {
    if (typeof window === "undefined") return null;

    const token = localStorage.getItem("token");
    if (!token) {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
      }
      return null;
    }

    if (!socketInstance || !socketInstance.connected) {
      const SOCKET_URL = getSocketUrl();

      socketInstance = io(SOCKET_URL, {
        auth: {
          token: token,
        },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socketInstance.on("connect", () => {
        console.log("Socket.IO connected successfully:", socketInstance.id);
      });

      socketInstance.on("connect_error", (err) => {
        console.warn("Socket.IO connection error:", err.message);
      });

      socketInstance.on("disconnect", (reason) => {
        console.log("Socket.IO disconnected:", reason);
      });
    }

    return socketInstance;
  },

  /**
   * Subscribe to real-time `dashboardUpdated` event
   */
  subscribeDashboardUpdated(callback) {
    const socket = this.getSocket();
    if (!socket || typeof callback !== "function") return;

    socket.off("dashboardUpdated", callback); // Prevent duplicate listeners
    socket.on("dashboardUpdated", callback);
  },

  /**
   * Unsubscribe from `dashboardUpdated` event
   */
  unsubscribeDashboardUpdated(callback) {
    if (socketInstance && typeof callback === "function") {
      socketInstance.off("dashboardUpdated", callback);
    }
  },

  /**
   * Disconnect Socket.IO instance
   */
  disconnectSocket() {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
  },
};
