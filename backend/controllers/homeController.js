const Category = require("../schemas/category");
const Product = require("../schemas/product");

function mapCategory(category) {
  return {
    _id: category._id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: category.image,
    updatedAt: category.updatedAt
  };
}

function mapProduct(product) {
  return {
    _id: product._id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    description: product.description,
    material: product.material,
    style: product.style,
    color: product.color,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    quantityInStock: product.quantityInStock,
    images: product.images,
    ratingAverage: product.ratingAverage,
    reviewCount: product.reviewCount,
    isFeatured: product.isFeatured,
    updatedAt: product.updatedAt,
    category: product.category
      ? {
          _id: product.category._id,
          name: product.category.name,
          slug: product.category.slug
        }
      : null
  };
}

async function getHomeData(_req, res, next) {
  try {
    const [categories, featuredProducts, latestProducts] = await Promise.all([
      Category.find({
        isActive: true,
        isDeleted: false
      })
        .sort({ sortOrder: 1, updatedAt: -1 })
        .limit(6),
      Product.find({
        status: "active",
        isDeleted: false,
        isFeatured: true
      })
        .populate("category", "name slug")
        .sort({ updatedAt: -1 })
        .limit(8),
      Product.find({
        status: "active",
        isDeleted: false
      })
        .populate("category", "name slug")
        .sort({ createdAt: -1 })
        .limit(8)
    ]);

    return res.status(200).json({
      categories: categories.map(mapCategory),
      featuredProducts: featuredProducts.map(mapProduct),
      latestProducts: latestProducts.map(mapProduct)
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getHomeData
};
