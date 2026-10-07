import { MailCheck } from "lucide-react";

export function RegistrationEmailReminder() {
  return <div className="flex items-start gap-2.5 rounded-md border border-border bg-card/70 p-3 text-xs sm:text-sm" role="note">
    <MailCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
    <p className="min-w-0 leading-relaxed text-muted-foreground">Please check your junk/spam folder to make sure you receive any further emails from <span className="font-semibold text-foreground">motionsserien.se</span></p>
  </div>;
}
