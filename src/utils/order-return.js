import { config } from '../config/index.js';
import { ORDER_STATUS } from '../shared/index.js';

export function getOrderDeliveredAt(order) {
  const entries = order.timeline || [];
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (entries[i].status === ORDER_STATUS.DELIVERED) {
      return new Date(entries[i].createdAt);
    }
  }
  return null;
}

export function getReturnDeadline(order, windowDays = config.returnWindowDays) {
  const deliveredAt = getOrderDeliveredAt(order);
  if (!deliveredAt) return null;
  const deadline = new Date(deliveredAt);
  deadline.setDate(deadline.getDate() + windowDays);
  deadline.setHours(23, 59, 59, 999);
  return deadline;
}

export function canRequestReturn(order) {
  if (order.status !== ORDER_STATUS.DELIVERED) return false;
  if (order.returnRequest?.status) return false;
  const deadline = getReturnDeadline(order);
  if (!deadline) return true;
  return new Date() <= deadline;
}

export function enrichOrderReturnMeta(orderObj) {
  orderObj.returnWindowDays = config.returnWindowDays;
  orderObj.deliveredAt = getOrderDeliveredAt(orderObj);
  orderObj.returnDeadline = getReturnDeadline(orderObj);
  orderObj.canRequestReturn = canRequestReturn(orderObj);
  return orderObj;
}
