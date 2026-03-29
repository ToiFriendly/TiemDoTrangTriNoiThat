const Category = require("../schemas/category");
const Product = require("../schemas/product");

function mapCategory(category) {
  return {
    _id: category._id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: category.image,
    parentCategory: category.parentCategory
      ? {
          _id: category.parentCategory._id,
          name: category.parentCategory.name,
          slug: category.parentCategory.slug
        }
      : null,
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
    dimensions: product.dimensions,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    quantityInStock: product.quantityInStock,
    images: product.images,
    tags: product.tags,
    ratingAverage: product.ratingAverage,
    reviewCount: product.reviewCount,
    sku: product.sku,
    status: product.status,
    isFeatured: product.isFeatured,
    createdAt: product.createdAt,
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

async function getProductDetail(req, res, next) {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      status: "active",
      isDeleted: false
    }).populate("category", "name slug");

    if (!product) {
      return res.status(404).json({ message: "Khong tim thay san pham." });
    }

    return res.status(200).json({
      product: mapProduct(product)
    });
  } catch (error) {
    return next(error);
  }
}

async function getCategoryProducts(req, res, next) {
  try {
    const category = await Category.findOne({
      slug: req.params.slug,
      isActive: true,
      isDeleted: false
    }).populate("parentCategory", "name slug");

    if (!category) {
      return res.status(404).json({ message: "Khong tim thay danh muc." });
    }

    const products = await Product.find({
      category: category._id,
      status: "active",
      isDeleted: false
    })
      .populate("category", "name slug")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      category: mapCategory(category),
      products: products.map(mapProduct)
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getHomeData,
  getProductDetail,
  getCategoryProducts
};
