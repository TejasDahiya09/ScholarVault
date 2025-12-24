import client from "./client";

// Extract the S3 object key from a full S3 URL if needed
export function resolveKeyFromUrl(s3Url) {
  try {
    if (!s3Url) return "";
    const url = new URL(s3Url);
    const host = url.hostname;
    const pathname = url.pathname.replace(/^\//, "");
    // Virtual-hosted style: <bucket>.s3.<region>.amazonaws.com/<key>
    const vh = host.match(/^[^.]+\.s3[.-][a-z0-9-]+\.amazonaws\.com$/i);
    if (vh) return decodeURIComponent(pathname);
    // Path style: s3.<region>.amazonaws.com/<bucket>/<key>
    const ps = host.match(/^s3[.-][a-z0-9-]+\.amazonaws\.com$/i);
    if (ps) {
      const [, ...rest] = pathname.split("/");
      return decodeURIComponent(rest.join("/"));
    }
    // Fallback: return decoded path portion
    return decodeURIComponent(pathname);
  } catch {
    return s3Url || "";
  }
}

// Get a signed URL for viewing or downloading
export async function getSignedPdfUrl(fileKey, mode = "view") {
  if (!fileKey) throw new Error("fileKey is required");
  const { data } = await client.get("/api/files/signed-url", {
    params: { key: fileKey, mode },
  });
  return data?.url;
}

export default { getSignedPdfUrl, resolveKeyFromUrl };
