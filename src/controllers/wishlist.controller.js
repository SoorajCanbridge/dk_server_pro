import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { AppError } from '../utils/errors.js';
import { PRODUCT_STATUS } from '../shared/index.js';

export async function getWishlist(req, res) {
  const user = await User.findById(req.user._id).populate({
    path: 'wishlist',
    match: { status: PRODUCT_STATUS.ACTIVE },
  });
  res.json({ success: true, data: user.wishlist });
}

export async function addToWishlist(req, res) {
  const { productId } = req.body;
  const product = await Product.findById(productId);
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');

  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { wishlist: productId },
  });

  res.status(201).json({ success: true, message: 'Added to wishlist' });
}

export async function removeFromWishlist(req, res) {
  await User.findByIdAndUpdate(req.user._id, {
    $pull: { wishlist: req.params.productId },
  });
  res.json({ success: true, message: 'Removed from wishlist' });
}
