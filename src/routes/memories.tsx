import { createFileRoute, redirect } from "@tanstack/react-router";

// Old address kept working: /memories now lives at /photos.
export const Route = createFileRoute("/memories")({
  beforeLoad: () => {
    throw redirect({ to: "/photos", statusCode: 301 });
  },
});
