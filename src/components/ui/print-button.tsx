"use client";
import { Localized } from "@/lib/i18n/provider";

import { Printer } from "lucide-react";
export function PrintButton() {
  return (
    <Localized>
      {
        <button
          className="button secondary full no-print"
          onClick={() => window.print()}
        >
          <Printer size={16} />
          Print decision brief
        </button>
      }
    </Localized>
  );
}
