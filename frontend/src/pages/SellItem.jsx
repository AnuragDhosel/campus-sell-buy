import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, ImagePlus, ArrowLeft, Loader2, Lock, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Navbar from '../components/Navbar';

const CATEGORIES = ['Books', 'Electronics', 'Furniture', 'Clothing', 'Stationery', 'Sports', 'Other'];
const MAX_IMAGES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_TITLE_LENGTH = 150;
const MAX_DESC_LENGTH = 2000;

const SellItem = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    collegeName: '',
    hostelName: '',
    roomNumber: '',
    sellerPhoneNumber: '',
  });

  const [images, setImages] = useState([]); // { file, preview }
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const handleImageSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const currentCount = images.length;

    if (currentCount + files.length > MAX_IMAGES) {
      setErrors((prev) => ({
        ...prev,
        images: `Maximum ${MAX_IMAGES} images allowed. You can add ${MAX_IMAGES - currentCount} more.`,
      }));
      e.target.value = '';
      return;
    }

    const validFiles = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          images: `"${file.name}" is not supported. Only JPG, JPEG, and PNG files are allowed.`,
        }));
        e.target.value = '';
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        setErrors((prev) => ({
          ...prev,
          images: `"${file.name}" is ${sizeMB}MB. Each image must be under 5MB.`,
        }));
        e.target.value = '';
        return;
      }
      validFiles.push({
        file,
        preview: URL.createObjectURL(file),
      });
    }

    setImages((prev) => [...prev, ...validFiles]);
    setErrors((prev) => {
      if (!prev.images) return prev;
      const next = { ...prev };
      delete next.images;
      return next;
    });

    e.target.value = '';
  }, [images.length]);

  const removeImage = useCallback((index) => {
    setImages((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  }, []);

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = 'Item name is required.';
    else if (formData.title.trim().length > MAX_TITLE_LENGTH)
      newErrors.title = `Title cannot exceed ${MAX_TITLE_LENGTH} characters.`;

    if (!formData.description.trim()) newErrors.description = 'Description is required.';
    else if (formData.description.trim().length > MAX_DESC_LENGTH)
      newErrors.description = `Description cannot exceed ${MAX_DESC_LENGTH} characters.`;

    if (!formData.price) newErrors.price = 'Price is required.';
    else if (Number(formData.price) <= 0) newErrors.price = 'Price must be greater than ₹0.';

    if (!formData.category) newErrors.category = 'Please select a category.';
    if (!formData.collegeName.trim()) newErrors.collegeName = 'College name is required.';
    if (!formData.hostelName.trim()) newErrors.hostelName = 'Hostel name is required.';
    if (!formData.roomNumber.trim()) newErrors.roomNumber = 'Room number is required.';

    if (!formData.sellerPhoneNumber.trim()) {
      newErrors.sellerPhoneNumber = 'Phone number is required.';
    } else {
      const phoneRegex = /^(?:\+91[\-\s]?)?[1-9]\d{9}$/;
      if (!phoneRegex.test(formData.sellerPhoneNumber.trim())) {
        newErrors.sellerPhoneNumber = 'Please enter a valid valid mobile number.';
      }
    }

    if (images.length === 0) newErrors.images = 'Upload at least 1 image of your item.';

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstErrorField = Object.keys(newErrors)[0];
      const el = document.getElementById(`field-${firstErrorField}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const data = new FormData();
      data.append('title', formData.title.trim());
      data.append('description', formData.description.trim());
      data.append('price', formData.price);
      data.append('category', formData.category);
      data.append('collegeName', formData.collegeName.trim());
      data.append('hostelName', formData.hostelName.trim());
      data.append('roomNumber', formData.roomNumber.trim());
      data.append('sellerPhoneNumber', formData.sellerPhoneNumber.trim());

      images.forEach((img) => {
        data.append('images', img.file);
      });

      await api.post('/api/items', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Item listed successfully! 🎉');

      images.forEach((img) => URL.revokeObjectURL(img.preview));

      setFormData({
        title: '',
        description: '',
        price: '',
        category: '',
        collegeName: '',
        hostelName: '',
        roomNumber: '',
        sellerPhoneNumber: '',
      });
      setImages([]);
      setErrors({});

      navigate('/my-listings');
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to list item. Please try again.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl border border-[#E2E8F0] flex items-center justify-center hover:bg-white transition"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-[#64748B]" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B]">Sell an Item</h1>
            <p className="text-[#64748B] text-sm mt-0.5">List your item for students on campus</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="saas-card p-6 sm:p-8 space-y-6" style={{ transform: 'none' }}>
            {/* Section: Item Details */}
            <div>
              <h2 className="text-lg font-semibold text-[#1E293B] mb-4">Item Details</h2>
              <div className="space-y-4">
                {/* Title */}
                <div id="field-title">
                  <label htmlFor="input-title" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                    Item Name <span className="text-[#D97757]">*</span>
                  </label>
                  <input
                    id="input-title"
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. Engineering Physics Textbook"
                    maxLength={MAX_TITLE_LENGTH}
                    aria-required="true"
                    aria-invalid={!!errors.title}
                    className={`saas-input ${errors.title ? 'border-[#D97757]' : ''}`}
                  />
                  <div className="flex justify-between mt-1">
                    {errors.title ? (
                      <p className="text-[#D97757] text-xs" role="alert">
                        {errors.title}
                      </p>
                    ) : (
                      <span />
                    )}
                    <span className="text-[#64748B] text-xs">
                      {formData.title.length}/{MAX_TITLE_LENGTH}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div id="field-description">
                  <label htmlFor="input-description" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                    Description <span className="text-[#D97757]">*</span>
                  </label>
                  <textarea
                    id="input-description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe your item, its condition, and any important details..."
                    rows={4}
                    maxLength={MAX_DESC_LENGTH}
                    aria-required="true"
                    aria-invalid={!!errors.description}
                    className={`saas-input resize-none ${errors.description ? 'border-[#D97757]' : ''}`}
                  />
                  <div className="flex justify-between mt-1">
                    {errors.description ? (
                      <p className="text-[#D97757] text-xs" role="alert">
                        {errors.description}
                      </p>
                    ) : (
                      <span />
                    )}
                    <span className="text-[#64748B] text-xs">
                      {formData.description.length}/{MAX_DESC_LENGTH}
                    </span>
                  </div>
                </div>

                {/* Price & Category Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Price */}
                  <div id="field-price">
                    <label htmlFor="input-price" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                      Price (₹) <span className="text-[#D97757]">*</span>
                    </label>
                    <input
                      id="input-price"
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="e.g. 350"
                      min={0}
                      aria-required="true"
                      aria-invalid={!!errors.price}
                      className={`saas-input ${errors.price ? 'border-[#D97757]' : ''}`}
                    />
                    {errors.price && (
                      <p className="text-[#D97757] text-xs mt-1" role="alert">
                        {errors.price}
                      </p>
                    )}
                  </div>

                  {/* Category Dropdown */}
                  <div id="field-category">
                    <label htmlFor="input-category" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                      Category <span className="text-[#D97757]">*</span>
                    </label>
                    <select
                      id="input-category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      aria-required="true"
                      aria-invalid={!!errors.category}
                      className={`saas-input ${errors.category ? 'border-[#D97757]' : ''} ${
                        !formData.category ? 'text-[#64748B]' : ''
                      }`}
                    >
                      <option value="">Select category</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    {errors.category && (
                      <p className="text-[#D97757] text-xs mt-1" role="alert">
                        {errors.category}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[#E2E8F0]" />

            {/* Section: Location & Contact Details */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-[#1E293B]">Location & Contact Details</h2>
              </div>
              <p className="text-[#64748B] text-xs mb-4">
                College name is <span className="font-semibold text-[#2F6B4F]">Public</span>. Room number & Phone number are <span className="font-semibold text-[#D97757]">Private</span> (shared only with approved buyers).
              </p>

              <div className="space-y-4">
                {/* College Name & Hostel Name Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* College Name */}
                  <div id="field-collegeName">
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="input-collegeName" className="text-sm font-medium text-[#1E293B]">
                        College Name <span className="text-[#D97757]">*</span>
                      </label>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#2F6B4F]/10 text-[#2F6B4F] px-2 py-0.5 rounded-full">
                        <Globe className="w-2.5 h-2.5" /> Public
                      </span>
                    </div>
                    <input
                      id="input-collegeName"
                      type="text"
                      name="collegeName"
                      value={formData.collegeName}
                      onChange={handleChange}
                      placeholder="e.g. MITS Gwalior"
                      aria-required="true"
                      aria-invalid={!!errors.collegeName}
                      className={`saas-input ${errors.collegeName ? 'border-[#D97757]' : ''}`}
                    />
                    {errors.collegeName && (
                      <p className="text-[#D97757] text-xs mt-1" role="alert">
                        {errors.collegeName}
                      </p>
                    )}
                  </div>

                  {/* Hostel Name */}
                  <div id="field-hostelName">
                    <label htmlFor="input-hostelName" className="block text-sm font-medium text-[#1E293B] mb-1.5">
                      Hostel Name <span className="text-[#D97757]">*</span>
                    </label>
                    <input
                      id="input-hostelName"
                      type="text"
                      name="hostelName"
                      value={formData.hostelName}
                      onChange={handleChange}
                      placeholder="e.g. Hostel Block A"
                      aria-required="true"
                      aria-invalid={!!errors.hostelName}
                      className={`saas-input ${errors.hostelName ? 'border-[#D97757]' : ''}`}
                    />
                    {errors.hostelName && (
                      <p className="text-[#D97757] text-xs mt-1" role="alert">
                        {errors.hostelName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Room Number & Phone Number Row (PRIVATE / LOCKED) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Room Number */}
                  <div id="field-roomNumber">
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="input-roomNumber" className="text-sm font-medium text-[#1E293B]">
                        Room Number <span className="text-[#D97757]">*</span>
                      </label>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#D97757]/10 text-[#D97757] px-2 py-0.5 rounded-full">
                        <Lock className="w-2.5 h-2.5" /> Private
                      </span>
                    </div>
                    <input
                      id="input-roomNumber"
                      type="text"
                      name="roomNumber"
                      value={formData.roomNumber}
                      onChange={handleChange}
                      placeholder="e.g. A-304"
                      aria-required="true"
                      aria-invalid={!!errors.roomNumber}
                      className={`saas-input ${errors.roomNumber ? 'border-[#D97757]' : ''}`}
                    />
                    {errors.roomNumber && (
                      <p className="text-[#D97757] text-xs mt-1" role="alert">
                        {errors.roomNumber}
                      </p>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div id="field-sellerPhoneNumber">
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="input-sellerPhoneNumber" className="text-sm font-medium text-[#1E293B]">
                        Phone Number <span className="text-[#D97757]">*</span>
                      </label>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#D97757]/10 text-[#D97757] px-2 py-0.5 rounded-full">
                        <Lock className="w-2.5 h-2.5" /> Private
                      </span>
                    </div>
                    <input
                      id="input-sellerPhoneNumber"
                      type="tel"
                      name="sellerPhoneNumber"
                      value={formData.sellerPhoneNumber}
                      onChange={handleChange}
                      placeholder="e.g. 9876543210"
                      aria-required="true"
                      aria-invalid={!!errors.sellerPhoneNumber}
                      className={`saas-input ${errors.sellerPhoneNumber ? 'border-[#D97757]' : ''}`}
                    />
                    {errors.sellerPhoneNumber && (
                      <p className="text-[#D97757] text-xs mt-1" role="alert">
                        {errors.sellerPhoneNumber}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[#E2E8F0]" />

            {/* Section: Images */}
            <div id="field-images">
              <h2 className="text-lg font-semibold text-[#1E293B] mb-1">Product Images</h2>
              <p className="text-[#64748B] text-xs mb-4">
                Upload 1–3 images. JPG, JPEG or PNG. Max 5MB each. ({images.length}/{MAX_IMAGES} uploaded)
              </p>

              {/* Image Previews */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                {images.map((img, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-[#E2E8F0] group">
                    <img
                      src={img.preview}
                      alt={`Product preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow-sm sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      aria-label={`Remove image ${index + 1}`}
                    >
                      <X className="w-4 h-4 text-[#1E293B]" />
                    </button>
                  </div>
                ))}

                {/* Add Image Button */}
                {images.length < MAX_IMAGES && (
                  <label
                    className="aspect-square rounded-xl border-2 border-dashed border-[#E2E8F0] flex flex-col items-center justify-center cursor-pointer hover:border-[#84A98C] hover:bg-[#84A98C]/5 transition focus-within:border-[#84A98C] focus-within:ring-2 focus-within:ring-[#84A98C]/20"
                    tabIndex={0}
                    role="button"
                    aria-label="Add product image"
                  >
                    <ImagePlus className="w-8 h-8 text-[#84A98C] mb-1" />
                    <span className="text-xs text-[#64748B]">Add Image</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      multiple
                      onChange={handleImageSelect}
                      className="sr-only"
                      tabIndex={-1}
                    />
                  </label>
                )}
              </div>

              {errors.images && (
                <p className="text-[#D97757] text-xs" role="alert">
                  {errors.images}
                </p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="saas-button-primary gap-2 px-8"
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  List Item
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SellItem;
