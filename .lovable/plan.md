# Photo and video views in Visitors

## What will change
- Add a new **Photo & video views** tab inside the existing Visitors dashboard.
- Show summary cards for total media views, viewed items, average views, and the most-viewed item.
- Add a professional ranked bar chart of the most-viewed gallery photos and videos, with clear media-type labels.
- Add a photo-versus-video views chart and a complete ranked table showing caption, type, views, upload date, and featured status.
- Include useful empty states for galleries with no uploads or no recorded views.

## Technical details
- Reuse the existing gallery `view_count`, `media_type`, `caption`, `is_pinned`, and `created_at` data; no new tracking or database table is needed.
- Load the gallery analytics through an admin-only server function and a dedicated query, keeping the Visitors dashboard private.
- Use the existing chart system and design tokens so the new analytics match the current dashboard and work on phone and desktop.
- Verify the dashboard builds successfully and the new tab renders without browser errors.
