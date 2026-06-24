export async function getOrderCustomerEmail(order) {
  if (order.guestEmail) return order.guestEmail;
  if (!order.userId) return null;

  const { User } = await import('../models/User.js');
  const user = await User.findById(order.userId).select('email name');
  return user?.email || null;
}

export async function getOrderCustomerName(order) {
  if (order.shippingAddress?.fullName) return order.shippingAddress.fullName;
  if (!order.userId) return '';

  const { User } = await import('../models/User.js');
  const user = await User.findById(order.userId).select('name');
  return user?.name || '';
}
