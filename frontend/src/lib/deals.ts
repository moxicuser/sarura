import type { StatusTone } from "../components/ui";
import type { OfferStatus, OrderStatus, RequestStatus } from "../types/api";

export function requestStatusTone(status: RequestStatus): StatusTone {
  if (status === "accepted") {
    return "success";
  }
  if (status === "pending" || status === "negotiating") {
    return "pending";
  }
  if (status === "rejected" || status === "expired") {
    return "danger";
  }
  return "neutral";
}

export function offerStatusTone(status: OfferStatus): StatusTone {
  if (status === "accepted") {
    return "success";
  }
  if (status === "pending") {
    return "pending";
  }
  if (status === "rejected" || status === "expired") {
    return "danger";
  }
  return "neutral";
}

export function orderStatusTone(status: OrderStatus): StatusTone {
  if (status === "confirmed" || status === "completed") {
    return "success";
  }
  if (status === "pending" || status === "negotiating") {
    return "pending";
  }
  if (status === "cancelled") {
    return "danger";
  }
  return "neutral";
}
