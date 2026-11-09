// server/services/partner.js
//
// Week 13: Partner API version adapter for Upstream Maji Website.
// The ONE place that knows the shape of our partner's API versions.

export const versions = {
  v1: {
    path: "/api/vendors/locations",
    parse: (body) => {
      if (!Array.isArray(body)) throw new Error("unexpected v1 shape");
      return body.map((v) => ({
        vendorId: v.vendorId,
        businessName: v.businessName || v.vendorName || "Unknown Vendor",
        estate: v.estate || v.location || "Nairobi",
      }));
    },
  },
  v2: {
    path: "/api/v2/vendors/locations",
    parse: (body) => {
      if (!body || !Array.isArray(body.data)) throw new Error("unexpected v2 shape");
      return body.data.map((v) => ({
        vendorId: v.vendorId,
        businessName: v.businessName || v.vendorName || "Unknown Vendor",
        estate: v.estate || v.location || "Nairobi",
      }));
    },
  },
};

export default { versions };

