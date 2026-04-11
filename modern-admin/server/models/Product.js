const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    enum: ['Hoodie', 'Mask', 'Toy'],
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  modelUrl: {
    type: String // GLB file URL from Cloudinary
  },
  status: {
    type: String,
    enum: ['standard', 'featured', 'trending'],
    default: 'standard'
  },
  analytics: {
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Product', ProductSchema);
