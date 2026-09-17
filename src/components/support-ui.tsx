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
        <Button size="sm" variant="outline" className="h-8 gap-1.5 border-primary/20 bg-primary/5 px-2.5 text-xs font-bold text-primary shadow-none hover:bg-primary/10 hover:text-primary">
          <HandHeart className="size-3.5" aria-hidden="true" />
          Donate
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-surface max-w-md border-primary/15 bg-card text-center">
        <DialogHeader className="items-center text-center">
          <DialogTitle className="font-display text-3xl font-bold text-primary">
            Support this website
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
          <span className="mt-2 block font-semibold">Swish reference: website</span>
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
      className="glass-surface mb-6 flex flex-col items-center justify-center gap-1 rounded-md border border-primary/15 bg-primary/5 px-4 py-3 text-center sm:flex-row sm:gap-2"
    >
      <Gift className="size-5 shrink-0 text-primary" aria-hidden="true" />
      <span className="text-xs font-bold uppercase text-primary">
        {data.sponsor_label.trim() || "This session is sponsored by:"}
      </span>
      <span className="font-semibold text-foreground">
        {data.sponsor_details.trim() || "Details to be added by admin later."}
      </span>
    </section>
  );
}