const mongoose = require('mongoose');

const trimmedString = (label, max) => ({
  type: String,
  trim: true,
  required: [true, `${label} is required`],
  maxlength: [max, `${label} must be at most ${max} characters`]
});

const productSchema = new mongoose.Schema(
  {
    name: trimmedString('Name', 160),
    description: trimmedString('Description', 4000),
    category: trimmedString('Category', 60),
    brand: trimmedString('Brand', 60),
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
      max: [10000000, 'Price looks too high'],
      set: (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v)
    },
    tags: {
      type: [String],
      default: [],
      set: normaliseTags,
      validate: {
        validator: (tags) => tags.length <= 20,
        message: 'A product can have at most 20 tags'
      }
    },
    inStock: {
      type: Boolean,
      default: true
    },
    rating: {
      type: Number,
      min: [0, 'Rating must be between 0 and 5'],
      max: [5, 'Rating must be between 0 and 5'],
      default: null
    },
    image: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Image URL is too long'],
      validate: {
        validator: (v) => !v || /^https?:\/\/\S+$/i.test(v),
        message: 'Image must be an http(s) URL'
      }
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Accepts an array or a comma separated string. Lowercases, trims and
// removes duplicates so "Wireless, wireless " ends up as one tag.
function normaliseTags(value) {
  if (value == null) return [];
  const list = Array.isArray(value) ? value : String(value).split(',');
  const seen = new Set();
  for (const raw of list) {
    if (raw == null) continue;
    const tag = String(raw).trim().toLowerCase().slice(0, 40);
    if (tag) seen.add(tag);
  }
  return [...seen];
}

productSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);
