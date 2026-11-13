"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";

export function SubscribeDialog() {
  const { t } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [invalid, setInvalid] = useState(false);
  return (
    <>
      <button
        className="civic-subscribe"
        type="button"
        onClick={() => dialog.current?.showModal()}
      >
        {t("Subscribe")}
      </button>
      <dialog
        ref={dialog}
        className="cityora-subscribe-dialog"
        aria-labelledby="subscribe-title"
        aria-describedby="subscribe-status"
        onKeyDown={(event) => event.stopPropagation()}
        onClose={() => {
          form.current?.reset();
          setInvalid(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="cityora-subscribe-content">
          <button
            type="button"
            className="cityora-dialog-close"
            aria-label={t("Close subscription dialog")}
            onClick={() => dialog.current?.close()}
          >
            <X size={22} aria-hidden="true" />
          </button>
          <p className="cityora-dialog-brand" translate="no">
            cityora.
          </p>
          <h2 id="subscribe-title">{t("Stay connected to your city.")}</h2>
          <p id="subscribe-status">
            {t("Email subscriptions are not available yet.")}
          </p>
          <form
            ref={form}
            onSubmit={(event) => {
              event.preventDefault();
            }}
          >
            <label htmlFor="subscribe-email">{t("Email address")}</label>
            <input
              id="subscribe-email"
              type="email"
              autoComplete="email"
              required
              aria-invalid={invalid}
              aria-describedby={`subscribe-privacy${invalid ? " subscribe-email-error" : ""}`}
              onInvalid={(event) => {
                event.preventDefault();
                setInvalid(true);
              }}
              onBlur={(event) =>
                setInvalid(
                  !!event.currentTarget.value &&
                    !event.currentTarget.validity.valid,
                )
              }
              onChange={(event) => {
                if (event.currentTarget.validity.valid) setInvalid(false);
              }}
            />
            {invalid && (
              <p
                id="subscribe-email-error"
                className="cityora-email-error"
                role="alert"
              >
                {t("Enter a valid email address.")}
              </p>
            )}
            <p id="subscribe-privacy" className="cityora-subscribe-privacy">
              {t(
                "Your email is not sent or saved. Close this window to clear it.",
              )}
            </p>
            <button type="submit" className="button primary" disabled>
              {t("Subscription unavailable")}
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
