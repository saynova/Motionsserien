import { MailCheck } from "lucide-react";

export function RegistrationEmailReminder() {
  return <div className="flex items-start gap-3 rounded-md border border-primary/25 bg-primary/5 p-3 text-sm" role="note">
    <MailCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
    <p className="min-w-0 font-semibold leading-relaxed">Please check your junk/spam folder to make sure you receive any further emails from motionsserien.se</p>
  </div>;
}