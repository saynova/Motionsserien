# Donation and sponsor displays

Add two independently controlled site-wide features: a donation prompt with a future Swish QR image, and a sponsor banner managed from the admin page.

## What will be built

### Donation button and popup
- Add a prominent yellow **Donate** button to the shared site header so it appears on every page.
- When clicked, open a focused popup with the Swish QR image centered at the top and this text below it: “If you are willing to support this website maintenance, you are welcome to donate.”
- Until an image is uploaded, show a clean QR placeholder visible only when the donation feature is enabled.
- Include clear close controls and keyboard/accessibility behavior.

### Sponsor banner
- Add a compact sponsor banner directly below the existing weekly champion banner, where it is visible without interrupting page content.
- Show “This session is sponsored by:” followed by the sponsor details entered by the admin.
- Keep it visually distinct from the champion banner and suitable for short sponsor text.

### Admin controls
- Add a collapsed **Donation & sponsor** section near the top of the admin page.
- Provide separate show/hide switches for the donation button and sponsor banner.
- Allow the admin to upload, replace, or remove the Swish QR image.
- Allow the admin to enter and update sponsor details.
- Changes take effect across every page after saving.

## Technical details
- Add a single public-read, admin-write site-support settings record for visibility flags, sponsor details, and the QR image reference.
- Add a dedicated image storage bucket with public read access for the QR image; uploads remain available only through the password-protected admin action.
- Read the settings through the existing shared query pattern and render both features from the shared page shell.
- Use existing design tokens, button components where available, and the current admin/session protections.
- Add the required database grants and row-level policies in the same migration.
- Keep donation and sponsorship display-only; no payment processor or donation tracking is added.

## Verification
- Check show/hide behavior independently for both features.
- Check QR upload, replacement, removal, popup open/close, and sponsor text updates.
- Verify desktop and mobile layouts across public pages and the admin page.
- Confirm no private admin data or upload permissions are exposed publicly.
