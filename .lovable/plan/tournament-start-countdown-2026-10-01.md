# Tournament start countdown

## What will change
- Add a tournament start date and time field inside the existing Admin → Registration & seeding section.
- Save the time in Swedish local time and include it with the existing public registration information.
- Show a stylish live countdown on the main registration page with days, hours, minutes, and seconds.
- Hide the countdown when no start time is set; show a clear “Tournament started” state after it passes.

## Technical details
- Add one nullable start-time column to the existing registration settings record without changing one-day tournament data.
- Add an admin-only save action and refresh the registration information after saving.
- Use a client-mounted timer to avoid server/browser time mismatches, updating once per second.
- Keep all colors and surfaces aligned with the site’s existing design tokens.

## Verification
- Confirm the admin can save and clear a start time.
- Confirm the registration page updates every second and remains clean on mobile and desktop.
- Check the latest app health output after implementation.
