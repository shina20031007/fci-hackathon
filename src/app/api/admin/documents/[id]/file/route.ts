import { currentStaff } from "@/features/admin/services/auth";
import { db } from "@/lib/db/client";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await currentStaff()))
    return new Response("Staff sign-in required.", { status: 401 });
  const file = await db.documentImport.findUnique({
    where: { id: (await params).id },
  });
  if (!file?.fileData)
    return new Response("File unavailable.", { status: 404 });
  return new Response(new Uint8Array(file.fileData), {
    headers: {
      "Content-Type": file.mediaType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "sandbox; default-src 'none'; frame-ancestors 'self'",
      "Referrer-Policy": "no-referrer",
    },
  });
}
