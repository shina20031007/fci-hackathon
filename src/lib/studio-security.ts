export function studioEnabled() {
  return process.env.STUDIO_ENABLED === "true";
}
export function checkStudioRequest(request: Request) {
  if (!studioEnabled())
    return "Municipal Studio is disabled. Enable STUDIO_ENABLED for local review.";
  const url = new URL(request.url);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    return "Studio mutations are available on loopback only.";
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") ?? url.host;
  try {
    const hostUrl = new URL(`${url.protocol}//${host}`);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(hostUrl.hostname))
      return "Studio mutations are available on loopback only.";
    if (!origin || new URL(origin).origin !== hostUrl.origin)
      return "A same-origin browser request is required.";
  } catch {
    return "A same-origin browser request is required.";
  }
  if (!request.headers.get("content-type")?.includes("application/json"))
    return "Use an application/json request.";
  return null;
}
