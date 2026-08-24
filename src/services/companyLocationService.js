/**
 * Company & Location Service Layer
 * Interacts with company and location backend routes.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const companyLocationService = {
  /**
   * GET /api/company/company-list
   * Raw response: { status: true, data: [{ id, company_name, status, ... }, ...] }
   * Returns companies (filters to Active-only if all = false).
   */
  async getCompanies(all = false) {
    const response = await fetch(`${API_BASE_URL}/company/company-list`);

    if (!response.ok) {
      throw new Error(`Failed to fetch companies (status ${response.status})`);
    }

    const json = await response.json();

    if (!json.status) {
      throw new Error(json.message || "Failed to fetch companies");
    }

    if (all) {
      return json;
    }

    const activeCompanies = (json.data || []).filter(
      (c) =>
        String(c.status).toLowerCase() === "active" || Number(c.status) === 1,
    );

    return { status: true, data: activeCompanies };
  },

  /**
   * GET /api/location/location-list
   * Raw response: { status: true, data: [{ id, company_id, location_name, status, company_name, ... }, ...] }
   * Returns locations (filters to Active-only if all = false).
   */
  async getLocations(all = false) {
    const response = await fetch(`${API_BASE_URL}/location/location-list`);

    if (!response.ok) {
      throw new Error(`Failed to fetch locations (status ${response.status})`);
    }

    const json = await response.json();

    if (!json.status) {
      throw new Error(json.message || "Failed to fetch locations");
    }

    if (all) {
      return json;
    }

    const activeLocations = (json.data || []).filter(
      (l) =>
        String(l.status).toLowerCase() === "active" || Number(l.status) === 1,
    );

    return { status: true, data: activeLocations };
  },

  /**
   * POST /api/company/add-company
   */
  async addCompany(companyData) {
    try {
      const response = await fetch(`${API_BASE_URL}/company/add-company`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyData),
      });

      if (!response.ok) {
        return {
          status: false,
          message: `Server returned error (${response.status})`,
        };
      }

      return await response.json();
    } catch (err) {
      return {
        status: false,
        message: err.message || "Failed to add company",
      };
    }
  },

  /**
   * PUT /api/company/update-company/:id
   */
  async updateCompany(id, companyData) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/company/update-company/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(companyData),
        },
      );

      if (!response.ok) {
        return {
          status: false,
          message: `Server returned error (${response.status})`,
        };
      }

      return await response.json();
    } catch (err) {
      return {
        status: false,
        message: err.message || "Failed to update company",
      };
    }
  },

  /**
   * DELETE /api/company/delete-company/:id
   */
  async deleteCompany(id) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/company/delete-company/${id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        return {
          status: false,
          message: `Server returned error (${response.status})`,
        };
      }

      return await response.json();
    } catch (err) {
      return {
        status: false,
        message: err.message || "Failed to delete company",
      };
    }
  },

  /**
   * POST /api/location/add-location
   */
  async addLocation(locationData) {
    try {
      const response = await fetch(`${API_BASE_URL}/location/add-location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(locationData),
      });

      if (!response.ok) {
        return {
          status: false,
          message: `Server returned error (${response.status})`,
        };
      }

      return await response.json();
    } catch (err) {
      return {
        status: false,
        message: err.message || "Failed to add location",
      };
    }
  },

  /**
   * PUT /api/location/update-location/:id
   */
  async updateLocation(id, locationData) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/location/update-location/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(locationData),
        },
      );

      if (!response.ok) {
        return {
          status: false,
          message: `Server returned error (${response.status})`,
        };
      }

      return await response.json();
    } catch (err) {
      return {
        status: false,
        message: err.message || "Failed to update location",
      };
    }
  },

  /**
   * DELETE /api/location/delete-location/:id
   */
  async deleteLocation(id) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/location/delete-location/${id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        return {
          status: false,
          message: `Server returned error (${response.status})`,
        };
      }

      return await response.json();
    } catch (err) {
      return {
        status: false,
        message: err.message || "Failed to delete location",
      };
    }
  },
};
