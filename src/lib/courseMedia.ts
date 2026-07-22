import { supabase } from "@/integrations/supabase/client";

const safeSegment = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "arquivo";

export async function resizeImageFile(file: File, maxWidth = 1400, quality = 0.85): Promise<Blob> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const reader = new FileReader();
    reader.onerror = () => rej(reader.error);
    reader.onload = () => res(reader.result as string);
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const element = new Image();
    element.onload = () => res(element);
    element.onerror = () => rej(new Error("Falha ao ler imagem"));
    element.src = dataUrl;
  });

  const scale = Math.min(1, maxWidth / img.width);
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);

  const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
  return await new Promise<Blob>((res, rej) =>
    canvas.toBlob((blob) => blob ? res(blob) : rej(new Error("Falha ao processar imagem")), mime, quality),
  );
}

export async function uploadCourseImage(file: File, folder: string): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Selecione uma imagem");
  if (file.size > 8 * 1024 * 1024) throw new Error("Imagem acima de 8 MB");

  const blob = await resizeImageFile(file);
  const ext = blob.type === "image/png" ? "png" : "jpg";
  const cleanFolder = folder.split("/").map(safeSegment).join("/");
  const path = `${cleanFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("course-images").upload(path, blob, {
    contentType: blob.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.storage.from("course-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (error || !data?.signedUrl) throw error ?? new Error("Falha ao gerar link da imagem");
  return data.signedUrl;
}

export function youtubeIdFromUrl(input?: string | null): string | null {
  if (!input) return null;
  const value = input.trim();
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/watch\?[^ ]*v=([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return match[1];
  }
  return /^[A-Za-z0-9_-]{11}$/.test(value) ? value : null;
}

// -------- Base64 (data:) image migration --------

export function isDataUrl(value?: string | null): boolean {
  return !!value && /^data:image\//i.test(value.trim());
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mimeMatch = meta.match(/data:([^;]+)/i);
  const mime = mimeMatch?.[1] ?? "image/png";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export async function uploadDataUrlAsImage(dataUrl: string, folder: string): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  const file = new File([blob], `paste-${Date.now()}.${blob.type === "image/png" ? "png" : "jpg"}`, { type: blob.type });
  return await uploadCourseImage(file, folder);
}

/**
 * Scans an HTML string, uploads any inline `data:image/*` src to Storage, and
 * returns the rewritten HTML with signed URLs. Skips non-data URLs unchanged.
 */
export async function migrateHtmlDataImages(html: string, folder: string): Promise<string> {
  if (!html || typeof window === "undefined") return html;
  if (!/src=["']data:image\//i.test(html)) return html;
  const doc = new DOMParser().parseFromString(`<div id="__root">${html}</div>`, "text/html");
  const root = doc.getElementById("__root");
  if (!root) return html;
  const imgs = Array.from(root.querySelectorAll("img"));
  for (const img of imgs) {
    const src = img.getAttribute("src") ?? "";
    if (!isDataUrl(src)) continue;
    try {
      const url = await uploadDataUrlAsImage(src, folder);
      img.setAttribute("src", url);
    } catch (e) {
      // se falhar, remove a imagem pesada para não travar o salvamento
      img.remove();
    }
  }
  return root.innerHTML;
}