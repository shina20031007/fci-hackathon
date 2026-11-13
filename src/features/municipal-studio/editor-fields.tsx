import { Localized } from "@/lib/i18n/provider";
import type { CivicProject } from "@/lib/validation/project";
export type EditorProps = {
  project: CivicProject;
  update: (project: CivicProject) => void;
};
export function Field({
  label,
  value,
  onChange,
  area = false,
  type = "text",
}: {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  area?: boolean;
  type?: string;
}) {
  return (
    <Localized>
      {
        <label>
          {label}
          {area ? (
            <textarea
              aria-label={label}
              rows={3}
              value={value ?? ""}
              onChange={(e) => onChange(e.target.value)}
              maxLength={12000}
            />
          ) : (
            <input
              aria-label={label}
              type={type}
              value={value ?? ""}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </label>
      }
    </Localized>
  );
}
export function Select({
  label,
  value,
  options,
  onChange,
  empty,
}: {
  label: string;
  value: string;
  options: readonly string[] | { id: string; title: string }[];
  onChange: (value: string) => void;
  empty?: string;
}) {
  return (
    <Localized>
      {
        <label>
          {label}
          <select
            aria-label={label}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          >
            {empty && <option value="">{empty}</option>}
            {options.map((o) =>
              typeof o === "string" ? (
                <option key={o}>{o}</option>
              ) : (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ),
            )}
          </select>
        </label>
      }
    </Localized>
  );
}
export function EvidenceSelect({
  project,
  value,
  onChange,
  label = "Supporting evidence",
}: {
  project: CivicProject;
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <Localized>
      {
        <Select
          label={label}
          value={value ?? ""}
          onChange={onChange}
          empty="No evidence selected"
          options={project.evidence.map((e) => ({
            id: e.id,
            title: `${project.sources.find((s) => s.id === e.sourceId)?.title ?? "Missing source"} — ${e.section}`,
          }))}
        />
      }
    </Localized>
  );
}
export function recordId() {
  return crypto.randomUUID();
}
