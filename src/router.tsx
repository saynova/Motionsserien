import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { initSameOriginRelay } from "./integrations/supabase/same-origin";
import { routeTree } from "./routeTree.gen";

// Restricted office networks block the backend's own address; keep browser
// traffic on this domain from the very first module that runs.
initSameOriginRelay();

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
