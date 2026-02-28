import { describe, expect, it } from "vitest";

import LabPage from "@/app/lab/page";

describe("/lab route", () => {
  it("redirects /lab to /", async () => {
    await expect(
      LabPage({
        searchParams: Promise.resolve({})
      })
    ).rejects.toMatchObject({
      digest: expect.stringContaining("/")
    });
  });

  it("redirects /lab and preserves range/box params", async () => {
    await expect(
      LabPage({
        searchParams: Promise.resolve({
          box: "box-03",
          range: "all"
        })
      })
    ).rejects.toMatchObject({
      digest: expect.stringContaining("/?range=all&box=box-03")
    });
  });
});
