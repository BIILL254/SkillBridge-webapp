// __tests__/partner.test.js
//
// Week 13: Tests for upstream partner (Maji Website) version adapter.

import { versions } from "../server/services/partner.js";

const v1Body = [
  { vendorId: 1, businessName: "Kilimani Water Hub", estate: "Kilimani" },
  { vendorId: 2, businessName: "Westlands Aqua", estate: "Westlands" },
];

const v2Body = {
  data: [
    { vendorId: 1, businessName: "Kilimani Water Hub", estate: "Kilimani" },
    { vendorId: 2, businessName: "Westlands Aqua", estate: "Westlands" },
  ],
  count: 2,
};

const wanted = [
  { vendorId: 1, businessName: "Kilimani Water Hub", estate: "Kilimani" },
  { vendorId: 2, businessName: "Westlands Aqua", estate: "Westlands" },
];

describe("partner version adapter", () => {
  test("v1 and v2 give the page exactly the same thing", () => {
    expect(versions.v1.parse(v1Body)).toEqual(wanted);
    expect(versions.v2.parse(v2Body)).toEqual(wanted);
  });

  test("the wrong parser fails loudly, not quietly", () => {
    expect(() => versions.v1.parse(v2Body)).toThrow();
    expect(() => versions.v2.parse(v1Body)).toThrow("unexpected v2 shape");
  });

  test("v2 parser tolerates vendorName and location fallbacks", () => {
    const v2Alternate = {
      data: [
        { vendorId: 5, vendorName: "Ruiru Springs", location: "Ruiru" },
      ],
      count: 1,
    };
    expect(versions.v2.parse(v2Alternate)).toEqual([
      { vendorId: 5, businessName: "Ruiru Springs", estate: "Ruiru" },
    ]);
  });
});

