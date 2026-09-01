import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Loader2, Lock, Globe, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import EmptyState from '../components/ui/EmptyState';

const CATEGORIES = ['Books', 'Electronics', 'Furniture', 'Clothing', 'Stationery', 'Sports', 'Other'];
const MAX_TITLE_LENGTH = 150;
const MAX_DESC_LENGTH = 2000;

const EditItem = () => {
  const { id } = useParams();
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

  const [existingImages, setExistingImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [loadingItem, setLoadingItem] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Item details to pre-fill form
  const fetchItem = useCallback(async () => {
    setLoadingItem(true);
    setFetchError(null);
    try {
      const response = await api.get(`/api/items/${id}`);
      const item = response.data?.data;
      if (!item) {
        setFetchError('Listing not found.');
        return;
      }

      setFormData({
        title: item.title || '',
        description: item.description || '',
        price: item.price ? String(item.price) : '',
        category: item.category || '',
        collegeName: item.collegeName || item.college || '',
        hostelName: item.hostelName || '',
        roomNumber: item.roomNumber || '',
        sellerPhoneNumber: item.sellerPhoneNumber || item.phoneNumber || '',
      });

      setExistingImages(item.images || []);
    } catch (err) {
      console.error('Failed to fetch item for edit:', err);
      if (err.response?.status === 403) {
        setFetchError('You are not authorized to edit this listing.');
      } else if (err.response?.status === 404) {
        setFetchError('This listing no longer exists.');
      } else {
        setFetchError(err.response?.data?.message || 'Unable to load listing details.');
      }
    } finally {
      setLoadingItem(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchItem();
  }, [id, fetchItem]);

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
        newErrors.sellerPhoneNumber = 'Please enter a valid 10-digit mobile number.';
      }
    }

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
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: Number(formData.price),
        category: formData.category,
        collegeName: formData.collegeName.trim(),
        hostelName: formData.hostelName.trim(),
        roomNumber: formData.roomNumber.trim(),
        sellerPhoneNumber: formData.sellerPhoneNumber.trim(),
      };

      await api.put(`/api/items/${id}`, payload);

      toast.success('Listing updated successfully! 🎉');
      navigate('/my-listings');
    } catch (error) {
      const msg = error.response?.data?.message || 'Unable to update listing. Please try again.';
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
            onClick={() => navigate('/my-listings')}
            className="w-10 h-10 rounded-xl border border-[#E2E8F0] flex items-center justify-center hover:bg-white transition"
            aria-label="Back to listings"
          >
            <ArrowLeft className="w-5 h-5 text-[#64748B]" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B]">Edit Listing</h1>
            <p className="text-[#64748B] text-sm mt-0.5">Update details for your marketplace item</p>
          </div>
        </div>

        {/* Loading State */}
        {loadingItem ? (
          <div className="saas-card p-8 flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="w-8 h-8 text-[#2F6B4F] animate-spin" />
            <p className="text-sm text-[#64748B]">Loading listing details...</p>
          </div>
        ) : fetchError ? (
          <EmptyState
            icon={ImageIcon}
            title="Unable to Edit Listing"
            description={fetchError}
            actionLabel="Back to My Listings"
            onAction={() => navigate('/my-listings')}
          />
        ) : (
          /* Form */
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
                        <p className="text-[#D97757] text-xs" role="alert">{errors.title}</p>
                      ) : <span />}
                      <span className="text-[#64748B] text-xs">{formData.title.length}/{MAX_TITLE_LENGTH}</span>
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
                        <p className="text-[#D97757] text-xs" role="alert">{errors.description}</p>
                      ) : <span />}
                      <span className="text-[#64748B] text-xs">{formData.description.length}/{MAX_DESC_LENGTH}</span>
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
                        <p className="text-[#D97757] text-xs mt-1" role="alert">{errors.price}</p>
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
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      {errors.category && (
                        <p className="text-[#D97757] text-xs mt-1" role="alert">{errors.category}</p>
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
                  College & Hostel names are <span className="font-semibold text-[#2F6B4F]">Public</span>. Room number & Phone number are <span className="font-semibold text-[#D97757]">Private</span> (shared only with approved buyers).
                </p>

                <div className="space-y-4">
                  {/* College Name & Hostel Name Row (PUBLIC) */}
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
                        <p className="text-[#D97757] text-xs mt-1" role="alert">{errors.collegeName}</p>
                      )}
                    </div>

                    {/* Hostel Name */}
                    <div id="field-hostelName">
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="input-hostelName" className="text-sm font-medium text-[#1E293B]">
                          Hostel Name <span className="text-[#D97757]">*</span>
                        </label>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#2F6B4F]/10 text-[#2F6B4F] px-2 py-0.5 rounded-full">
                          <Globe className="w-2.5 h-2.5" /> Public
                        </span>
                      </div>
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
                        <p className="text-[#D97757] text-xs mt-1" role="alert">{errors.hostelName}</p>
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
                        <p className="text-[#D97757] text-xs mt-1" role="alert">{errors.roomNumber}</p>
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
                        <p className="text-[#D97757] text-xs mt-1" role="alert">{errors.sellerPhoneNumber}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-[#E2E8F0]" />

              {/* Section: Existing Images Preview */}
              <div>
                <h2 className="text-lg font-semibold text-[#1E293B] mb-1">Product Images</h2>
                <p className="text-[#64748B] text-xs mb-3">
                  Current listing images. Image updates remain unchanged during text updates.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {existingImages.map((img, index) => (
                    <div key={index} className="aspect-square rounded-xl overflow-hidden border border-[#E2E8F0]">
                      <img src={img.url} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/my-listings')}
                disabled={isSubmitting}
                className="saas-button-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="saas-button-primary gap-2 px-8"
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditItem;
