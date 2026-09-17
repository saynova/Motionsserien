import { useQuery } from "@tanstack/react-query";
import { Gift, HandHeart, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supportSettingsQueryOptions } from "@/lib/tournament-query";

export function DonationButton() {
  const { data } = useQuery(supportSettingsQueryOptions);
  if (!data?.donation_visible) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-accent font-bold uppercase text-accent-foreground shadow hover:bg-accent/90">
          <HandHeart aria-hidden="true" />
          Donate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md border-accent/50 bg-card text-center">
        <DialogHeader className="items-center text-center">
          <DialogTitle className="font-display text-3xl font-bold uppercase text-accent">
            Support Motionsserien
          </DialogTitle>
        </DialogHeader>
        <div className="mx-auto flex aspect-square w-full max-w-64 items-center justify-center overflow-hidden rounded-md border border-border bg-background p-3">
          {data.qr_image_url ? (
            <img
              src={data.qr_image_url}
              alt="Swish donation QR code"
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <QrCode className="size-16" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase">QR code coming soon</span>
            </div>
          )}
        </div>
        <DialogDescription className="text-center text-base leading-relaxed text-foreground">
          If you are willing to support this website maintenance, you are welcome to donate.
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}

export function SponsorBanner() {
  const { data } = useQuery(supportSettingsQueryOptions);
  if (!data?.sponsor_visible) return null;

  return (
    <section
      aria-label="Session sponsor"
      className="mb-6 flex flex-col items-center justify-center gap-1 rounded-md border border-accent/50 bg-accent/10 px-4 py-3 text-center sm:flex-row sm:gap-2"
    >
      <Gift className="size-5 shrink-0 text-accent" aria-hidden="true" />
      <span className="text-xs font-bold uppercase text-accent">This session is sponsored by:</span>
      <span className="font-semibold text-foreground">
        {data.sponsor_details.trim() || "Details to be added by admin later."}
      </span>
    </section>
  );
}