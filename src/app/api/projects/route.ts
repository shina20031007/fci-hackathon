import { NextResponse } from "next/server";
import { createProject, WorkflowError } from "@/lib/db/projects";
import { projectSchema } from "@/lib/validation/project";
import { checkStudioRequest } from "@/lib/studio-security";
export async function POST(request: Request) {
  const denied = checkStudioRequest(request);
  if (denied) return NextResponse.json({ error: denied }, { status: 403 });
  try {
    const result = projectSchema.safeParse(await request.json());
    if (!result.success)
      return NextResponse.json(
        { error: result.error.issues.map((i) => i.message).join(" ") },
        { status: 400 },
      );
    return NextResponse.json(
      { project: await createProject(result.data) },
      { status: 201 },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof WorkflowError
            ? e.message
            : "Unable to create the project. Check its fields and try again.",
      },
      { status: e instanceof WorkflowError ? e.status : 400 },
    );
  }
}
