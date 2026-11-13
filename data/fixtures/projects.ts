import {
  projectSchema,
  type CivicProject,
} from "../../src/lib/validation/project";
const reviewed = "2026-11-12T15:00:00Z";
const cases = [
  {
    id: "cedar-quarter",
    title: "Cedar Quarter neighbourhood plan",
    category: "Land Use and Zoning" as const,
    neighbourhood: "Cedar Quarter",
    status: "Awaiting Additional Approval" as const,
    authority: "Town of Fairhaven Council (fictional)",
    summary:
      "A plan for homes, local shops, and a connected public green in Cedar Quarter. Council adopted a revised plan; an additional planning approval remains outstanding.",
    rationale:
      "The fictional staff report identifies a need for more housing choices and a continuous public walking route.",
    decision: "Mixed-use height and public access",
    before:
      "Permit buildings up to six storeys. Provide a public walking route through the site.",
    after:
      "Permit buildings up to four storeys along Cedar Lane and six storeys elsewhere. Secure a continuous public walking route before development approval.",
    condition:
      "Additional planning approval is required. Public access must be secured before development approval.",
    amendment:
      "Added a four-storey edge and a condition securing public access.",
    uncertainty:
      "The available record does not establish an effective date or confirm the additional approval.",
    topic: "Housing",
    concern:
      "Residents asked how building heights would meet the existing neighbourhood and whether the walking route would remain public.",
    response:
      "The consultation response recommends a lower edge and a secured public route. The fictional council record adopts both changes.",
    classification: "Accepted" as const,
    method: "Written comments",
    description:
      "Historical comments on the draft neighbourhood plan. No current participation opportunity is established.",
    opens: "2026-07-01T09:00:00-04:00",
    deadline: "2026-08-14T17:00:00-04:00",
    x: -80.515,
    y: 43.465,
    kind: "Planning area" as const,
  },
  {
    id: "willow-street",
    title: "Willow Street complete street",
    category: "Transportation" as const,
    neighbourhood: "Riverside",
    status: "Staff Recommendation" as const,
    authority: "Fairhaven Transportation Services (fictional)",
    summary:
      "A proposed redesign of Willow Street adds protected cycling space and accessible crossings. Staff recommend a revised design; council has not approved construction.",
    rationale:
      "The fictional design report identifies gaps in crossing accessibility and continuity of cycling space.",
    decision: "Accessible crossings and cycling space",
    before: "Provide painted cycle lanes and two new pedestrian crossings.",
    after:
      "Provide protected cycle lanes and three accessible pedestrian crossings. Retain a loading space near the community centre.",
    condition:
      "Council approval and a confirmed capital allocation are required before construction can proceed.",
    amendment:
      "Revised the crossing provision, cycle-lane protection, and community-centre loading space.",
    uncertainty:
      "No construction schedule, travel-time analysis, or traffic effects are verified.",
    topic: "Accessibility",
    concern:
      "Residents asked for an accessible crossing near the community centre and space for assisted drop-off.",
    response:
      "The design response explicitly links the additional accessible crossing and retained loading space to this concern.",
    classification: "Partially Accepted" as const,
    method: "Public consultation",
    description:
      "Example consultation on the revised crossing and cycling layout. This fictional window cannot accept real submissions.",
    opens: "2026-11-01T09:00:00-05:00",
    deadline: "2026-12-15T17:00:00-05:00",
    x: -80.489,
    y: 43.452,
    kind: "Transportation feature" as const,
  },
  {
    id: "community-renewal",
    title: "Community facilities renewal budget",
    category: "Municipal Budget" as const,
    neighbourhood: "Municipality-wide",
    status: "Council Decision" as const,
    authority: "Town of Fairhaven Council (fictional)",
    summary:
      "Council approved a fictional capital budget for community-facility renewal. The allocation applies across the municipality; individual works still require project-level scheduling.",
    rationale:
      "The fictional asset report identifies a need to prioritize accessibility and essential building repairs.",
    decision: "Renewal funding and reporting condition",
    before: "Allocate renewal funding to community facilities.",
    after:
      "Allocate renewal funding to community facilities, with annual public reporting on accessibility work and essential repairs.",
    condition:
      "Annual reporting is required. A budget allocation does not confirm individual construction dates.",
    amendment: "Added annual public reporting as a budget condition.",
    uncertainty:
      "Facility-level spending and delivery dates are not established in the available record.",
    topic: "Cost",
    concern:
      "Residents asked how renewal priorities and spending would be reported.",
    response:
      "The fictional budget response explains that annual public reporting will accompany the allocation.",
    classification: "Explanation Provided" as const,
    method: "Budget consultation",
    description:
      "Historical consultation on renewal priorities. No verified current window is available.",
    opens: "2026-02-01T09:00:00-05:00",
    deadline: "2026-03-01T17:00:00-05:00",
    x: -80.5,
    y: 43.46,
    kind: "Municipality boundary" as const,
  },
];
export const fixtureProjects: CivicProject[] = cases.map((c, index) => {
  const key = (suffix: string) => `${c.id}-${suffix}`;
  const dates =
    index === 2
      ? ["2026-01-15", "2026-03-10", "2026-03-24"]
      : ["2026-06-15", "2026-09-10", "2026-10-22"];
  const sourceTexts = [
    `${c.rationale} Initial draft: ${c.before}`,
    `Public concern: ${c.concern} Response: ${c.response} Revised proposal: ${c.after}`,
    `${c.summary} ${c.rationale} ${c.authority}: ${c.status}. ${c.after} Conditions: ${c.condition} ${c.uncertainty}`,
    `${c.method}. ${c.description} Opens: ${c.opens}. Deadline: ${c.deadline}. Time zone: America/Toronto. These are fictional dates for demonstration only.`,
    `Illustrative ${c.kind.toLowerCase()} for ${c.title}. Coordinates are demonstration geometry only, not an official boundary. No property-level impact is established.`,
  ];
  return projectSchema.parse({
    id: c.id,
    municipality: "Fairhaven (fictional)",
    title: c.title,
    category: c.category,
    neighbourhood: c.neighbourhood,
    summary: c.summary,
    rationale: c.rationale,
    authority: c.authority,
    status: c.status,
    synthetic: true,
    summaryEvidenceId: key("evidence-2"),
    revision: 1,
    reviewStatus: "Published",
    verifiedAt: reviewed,
    updatedAt: reviewed,
    sources: sourceTexts.map((_, i) => ({
      id: key(`source-${i}`),
      title: [
        "Project briefing and initial draft",
        "Consultation response and revised proposal",
        "Decision record",
        "Participation notice",
        "Illustrative geographic dataset",
      ][i],
      type: [
        "Staff report",
        "Consultation report",
        index === 1 ? "Staff report" : "Council minutes",
        "Public notice",
        "Geographic dataset",
      ][i],
      url: null,
      date: i < 3 ? dates[i] : i === 3 ? c.opens.slice(0, 10) : dates[0],
      synthetic: true,
    })),
    evidence: sourceTexts.map((excerpt, i) => ({
      id: key(`evidence-${i}`),
      sourceId: key(`source-${i}`),
      excerpt,
      section:
        i === 4 ? "GeoJSON fixture; illustrative extent" : `Section ${i + 1}`,
      state: "Requires Verification",
      verifiedAt: reviewed,
      notes:
        "Checked for internal consistency only. Fictional source; not official verification.",
    })),
    decisions: [
      {
        id: key("decision"),
        title: c.decision,
        explanation: c.after,
        status: c.status,
        authority: c.authority,
        conditions: c.condition,
        amendment: c.amendment,
        uncertainty: c.uncertainty,
        date: dates[2],
        reviewState: "Verified",
        notes: "Demonstration review only.",
        evidenceIds: [key("evidence-2")],
      },
    ],
    events: dates.map((date, i) => ({
      id: key(`event-${i}`),
      decisionId: key("decision"),
      title: [
        "Initial proposal recorded",
        "Public feedback and revised proposal",
        index === 1
          ? "Staff recommendation issued"
          : "Council decision recorded",
      ][i],
      date,
      type: [
        "Initial proposal",
        "Consultation",
        index === 1 ? "Staff report" : "Council decision",
      ][i],
      description: [c.before, c.amendment, `${c.status}. ${c.condition}`][i],
      evidenceId: key(`evidence-${i}`),
    })),
    versions: [
      {
        id: key("v1"),
        label: "01 · Initial proposal",
        date: dates[0],
        text: c.before,
        changeType: "Initial proposal",
        reason: "",
        evidenceId: key("evidence-0"),
      },
      {
        id: key("v2"),
        label: "02 · Revised proposal",
        date: dates[1],
        text: c.after,
        changeType: "Substantive policy change",
        reason: c.response,
        evidenceId: key("evidence-1"),
      },
    ],
    feedback: [
      {
        id: key("feedback"),
        decisionId: key("decision"),
        topic: c.topic,
        summary: c.concern,
        response: c.response,
        classification: c.classification,
        amendment: c.amendment,
        date: dates[1],
        evidenceId: key("evidence-1"),
      },
      {
        id: key("feedback-unknown"),
        decisionId: key("decision"),
        topic: "Environment",
        summary:
          "A request for more detail about environmental outcomes is included in this fictional exercise.",
        response: "",
        classification: "No Verified Response Found",
        amendment: "",
        date: dates[1],
        evidenceId: null,
      },
    ],
    opportunities: [
      {
        id: key("opportunity"),
        decisionId: key("decision"),
        method: c.method,
        description: c.description,
        opensAt: c.opens,
        deadline: c.deadline,
        meetingAt: null,
        timeZone: "America/Toronto",
        url: null,
        verifiedAt: reviewed,
        evidenceId: key("evidence-3"),
        confirmed: true,
      },
    ],
    scopes: [
      {
        id: key("scope"),
        decisionId: key("decision"),
        label:
          index === 2
            ? "Fairhaven illustrative municipal extent"
            : c.neighbourhood,
        kind: c.kind,
        geometry:
          index === 1
            ? {
                type: "LineString",
                coordinates: [
                  [c.x - 0.018, c.y - 0.009],
                  [c.x, c.y],
                  [c.x + 0.018, c.y + 0.012],
                ],
              }
            : {
                type: "Polygon",
                coordinates: [
                  [
                    [
                      c.x - (index === 2 ? 0.06 : 0.012),
                      c.y - (index === 2 ? 0.04 : 0.008),
                    ],
                    [
                      c.x + (index === 2 ? 0.06 : 0.012),
                      c.y - (index === 2 ? 0.04 : 0.008),
                    ],
                    [
                      c.x + (index === 2 ? 0.06 : 0.012),
                      c.y + (index === 2 ? 0.04 : 0.008),
                    ],
                    [
                      c.x - (index === 2 ? 0.06 : 0.012),
                      c.y + (index === 2 ? 0.04 : 0.008),
                    ],
                    [
                      c.x - (index === 2 ? 0.06 : 0.012),
                      c.y - (index === 2 ? 0.04 : 0.008),
                    ],
                  ],
                ],
              },
        description:
          "Demonstration geometry — fictional extent. Spatial relationships are calculated; impacts are not established.",
        evidenceId: key("evidence-4"),
      },
    ],
  });
});
