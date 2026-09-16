import { queryOptions } from "@tanstack/react-query";

import { getAdminStatus, getTournament } from "./tournament.functions";
import { getAllShuttleOrders, getBanner, getShuttleOrders } from "./extras.functions";

export const tournamentQueryOptions = queryOptions({
  queryKey: ["tournament"],
  queryFn: () => getTournament(),
});

export const adminStatusQueryOptions = queryOptions({
  queryKey: ["admin-status"],
  queryFn: () => getAdminStatus(),
});

export const bannerQueryOptions = queryOptions({
  queryKey: ["banner"],
  queryFn: () => getBanner(),
});

export const shuttleOrdersQueryOptions = queryOptions({
  queryKey: ["shuttle-orders"],
  queryFn: () => getShuttleOrders(),
});

export const adminShuttleOrdersQueryOptions = queryOptions({
  queryKey: ["shuttle-orders", "admin"],
  queryFn: () => getAllShuttleOrders(),
});
