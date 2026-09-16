import { queryOptions } from "@tanstack/react-query";

import { getAdminStatus, getTournament } from "./tournament.functions";

export const tournamentQueryOptions = queryOptions({
  queryKey: ["tournament"],
  queryFn: () => getTournament(),
});

export const adminStatusQueryOptions = queryOptions({
  queryKey: ["admin-status"],
  queryFn: () => getAdminStatus(),
});
