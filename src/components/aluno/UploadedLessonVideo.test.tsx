import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UploadedLessonVideo } from "./UploadedLessonVideo";

const { createSignedUrl, from } = vi.hoisted(() => {
  const createSignedUrl = vi.fn();
  return { createSignedUrl, from: vi.fn(() => ({ createSignedUrl })) };
});
vi.mock("@/integrations/supabase/client", () => ({ supabase: { storage: { from } } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("UploadedLessonVideo", () => {
  it("loads an uploaded lesson through a signed URL from the private video bucket", async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://example.test/signed-video.mp4" }, error: null });
    render(<UploadedLessonVideo path="course/lesson.mp4" title="Videoaula" />);
    await waitFor(() => expect(screen.getByLabelText("Videoaula").getAttribute("src")).toBe("https://example.test/signed-video.mp4"));
    expect(from).toHaveBeenCalledWith("course-videos");
    expect(createSignedUrl).toHaveBeenCalledWith("course/lesson.mp4", 14400);
  });

  it("reports an inaccessible file instead of leaving playback loading forever", async () => {
    createSignedUrl.mockResolvedValue({ data: null, error: new Error("Denied") });
    render(<UploadedLessonVideo path="course/denied.mp4" title="Videoaula" />);
    await screen.findByRole("alert");
    expect(screen.queryByRole("status")).toBeNull();
  });
});