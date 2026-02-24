import { describe, expect, it } from "vitest";

import AppCatchallPage from "@/app/app/[...slug]/page";
import DashboardPage from "@/app/dashboard/page";
import LoginPage from "@/app/login/page";
import TimelinePage from "@/app/timeline/page";

describe("read-only redirects", () => {
  it("redirects /login to read-only notice", () => {
    try {
      LoginPage();
      throw new Error("Expected redirect");
    } catch (error) {
      expect(error).toMatchObject({
        digest: expect.stringContaining("/?notice=read-only")
      });
    }
  });

  it("redirects /app/* routes to read-only notice", async () => {
    await expect(
      AppCatchallPage({
        params: Promise.resolve({ slug: ["logs", "new"] })
      })
    ).rejects.toMatchObject({
      digest: expect.stringContaining("/?notice=read-only")
    });
  });

  it("redirects /dashboard to /", async () => {
    await expect(
      DashboardPage({
        searchParams: Promise.resolve({})
      })
    ).rejects.toMatchObject({
      digest: expect.stringContaining("/")
    });
  });

  it("redirects /dashboard?range=7d to /?range=7d", async () => {
    await expect(
      DashboardPage({
        searchParams: Promise.resolve({ range: "7d" })
      })
    ).rejects.toMatchObject({
      digest: expect.stringContaining("/?range=7d")
    });
  });

  it("redirects /timeline to /", () => {
    try {
      TimelinePage();
      throw new Error("Expected redirect");
    } catch (error) {
      expect(error).toMatchObject({
        digest: expect.stringContaining("/")
      });
    }
  });
});
