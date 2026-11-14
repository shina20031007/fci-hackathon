import { currentStaff } from "@/features/admin/services/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  saveProject,
  transitionProject,
  WorkflowError,
} from "@/lib/db/projects";
import { projectSchema } from "@/lib/validation/project";
import { checkStudioRequest } from "@/lib/studio-security";
const payload = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), project: projectSchema }),
  z.object({
    action: z.enum(["review", "verify", "publish"]),
    revision: z.number().int().positive(),
    note: z.string().trim().min(1).max(2000),
  }),
]);
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const denied = await checkStudioRequest(request);
  if (denied) return NextResponse.json({ error: denied }, { status: 403 });
  const { projectId } = await params;
  try {
    const parsed = payload.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        {
          error: parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join(" "),
        },
        { status: 400 },
      );
    const data = parsed.data;
    if (data.action === "save" && data.project.id !== projectId)
      return NextResponse.json(
        { error: "Project ID does not match the route." },
        { status: 400 },
      );
    const project =
      data.action === "save"
        ? await saveProject(data.project, undefined, (await currentStaff())!)
        : await transitionProject(
            projectId,
            data.revision,
            data.action,
            `${data.note} Staff: ${await currentStaff()}`,
          );
    return NextResponse.json({ project });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof WorkflowError
            ? e.message
            : "Unable to save. Check your records and reload if necessary.",
      },
      { status: e instanceof WorkflowError ? e.status : 400 },
    );
  }
}
