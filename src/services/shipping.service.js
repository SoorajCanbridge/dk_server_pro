import { ShippingZone } from '../models/ShippingZone.js';
import { config } from '../config/index.js';
import { AppError } from '../utils/errors.js';

export async function getShippingRate(pincode, subtotal) {
  const zone = await ShippingZone.findOne({ pincodes: pincode });
  if (zone) {
    if (zone.freeAbove && subtotal >= zone.freeAbove) return { rate: 0, zone: zone.name };
    return { rate: zone.rate, zone: zone.name };
  }

  const defaultZone = await ShippingZone.findOne({ isDefault: true });
  if (defaultZone) {
    if (defaultZone.freeAbove && subtotal >= defaultZone.freeAbove) return { rate: 0, zone: defaultZone.name };
    return { rate: defaultZone.rate, zone: defaultZone.name };
  }

  if (subtotal >= config.freeShippingAbove) return { rate: 0, zone: 'Free Shipping' };
  return { rate: config.defaultShippingRate, zone: 'Standard' };
}

export async function validatePincode(pincode) {
  const zones = await ShippingZone.find({ pincodes: { $exists: true, $ne: [] } });
  if (zones.length === 0) return { serviceable: true, message: 'All pincodes serviceable' };

  const zone = await ShippingZone.findOne({ pincodes: pincode });
  if (!zone) throw new AppError('Sorry, we do not deliver to this pincode', 400, 'PINCODE_NOT_SERVICEABLE');
  return { serviceable: true, zone: zone.name };
}
