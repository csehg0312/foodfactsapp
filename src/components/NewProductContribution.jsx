import { createSignal, createEffect } from 'solid-js';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid'; // For generating UUIDs
import './ProductContribution.css';

const ProductContribution = (props) => {
  const initialProductData = {
    code: props.barcode || '',
    product_name: '',
    creator: '',
    data_sources_tags: [],
    nutriscore: {
      "2023": {
        category_available: 1,
        data: {
          energy: 0,
          fiber: 0,
          proteins: 0,
          saturated_fat: 0,
          sodium: 0,
          sugars: 0,
          fruits_vegetables_nuts_colza_walnut_olive_oils: 0,
          is_beverage: 0,
          is_cheese: 0,
          is_fat: 0,
          is_water: 0,
          components: {
            negative: [],
            positive: []
          }
        },
        grade: '',
        score: 0,
        nutrients_available: 1,
        nutriscore_applicable: 1,
        nutriscore_computed: 1
      }
    },
    ingredients_tags: [],
    brands_tags: [],
    categories_tags: [],
    images: []
  };

  const [productData, setProductData] = createSignal(initialProductData);
  const [currentInput, setCurrentInput] = createSignal({
    brands: '',
    categories: '',
    ingredients: '',
    data_sources: ''
  });
  const [contributionStatus, setContributionStatus] = createSignal(null);
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  // Generate or retrieve app_uuid
  const getAppUuid = () => {
    let appUuid = localStorage.getItem('app_uuid');
    if (!appUuid) {
      appUuid = uuidv4(); // Generate a new UUID
      localStorage.setItem('app_uuid', appUuid); // Store it for future use
    }
    return appUuid;
  };

  // Validation effect
  createEffect(() => {
    const data = productData();
    const isValid = data.product_name && 
                   data.creator && 
                   data.brands_tags.length > 0;
    
    return isValid;
  });

  const handleInputChange = (field, value) => {
    setProductData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBooleanInput = (field, value) => {
    setProductData(prev => ({
      ...prev,
      nutriscore: {
        ...prev.nutriscore,
        "2023": {
          ...prev.nutriscore["2023"],
          data: {
            ...prev.nutriscore["2023"].data,
            [field]: value ? 1 : 0
          }
        }
      }
    }));
  };

  const handleNutriscoreInput = (key, value) => {
    const numValue = Number(value) || 0;
    setProductData(prev => ({
      ...prev,
      nutriscore: {
        ...prev.nutriscore,
        "2023": {
          ...prev.nutriscore["2023"],
          data: {
            ...prev.nutriscore["2023"].data,
            [key]: numValue
          }
        }
      }
    }));
  };

  const addTag = (field, value) => {
    if (!value.trim()) return;
    
    const tagValue = field === 'data_sources' 
      ? value.trim().toLowerCase().replace(/\s+/g, '-')
      : `en:${value.trim().toLowerCase().replace(/\s+/g, '-')}`;
    
    setProductData(prev => ({
      ...prev,
      [`${field}_tags`]: [...new Set([...prev[`${field}_tags`], tagValue])]
    }));

    setCurrentInput(prev => ({
      ...prev,
      [field === 'data_sources' ? 'data_source' : field]: ''
    }));
  };

  const removeTag = (field, tagToRemove) => {
    setProductData(prev => ({
      ...prev,
      [`${field}_tags`]: prev[`${field}_tags`].filter(tag => tag !== tagToRemove)
    }));
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    const validFiles = files.filter(file => {
      const isValid = file.size <= maxSize && file.type.startsWith('image/');
      if (!isValid) {
        setContributionStatus({
          type: 'error',
          message: `File ${file.name} is too large or not an image`
        });
      }
      return isValid;
    });

    const previews = await Promise.all(
      validFiles.map(file => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ file, preview: reader.result });
        reader.readAsDataURL(file);
      }))
    );

    setProductData(prev => ({ ...prev, images: [...prev.images, ...previews] }));
  };

  const submitContribution = async () => {
    try {
      setIsSubmitting(true);
      const formData = new FormData();
      
      // Basic product info
      formData.append('code', productData().code);
      formData.append('product_name', productData().product_name);
      formData.append('creator', productData().creator);
      
      // Tags
      ['brands_tags', 'categories_tags', 'ingredients_tags', 'data_sources_tags'].forEach(field => {
        productData()[field].forEach(tag => {
          formData.append(`${field}[]`, tag);
        });
      });

      // Add creator to informers_tags
      formData.append('informers_tags[]', productData().creator);
      
      // Nutriscore data
      const nutriscoreData = productData().nutriscore["2023"];
      Object.entries(nutriscoreData.data).forEach(([key, value]) => {
        if (key === 'components') {
          Object.entries(value).forEach(([type, components]) => {
            components.forEach((component, index) => {
              Object.entries(component).forEach(([field, val]) => {
                formData.append(`nutriscore[2023][data][components][${type}][${index}][${field}]`, val);
              });
            });
          });
        } else {
          formData.append(`nutriscore[2023][data][${key}]`, value);
        }
      });
      
      formData.append('nutriscore[2023][grade]', nutriscoreData.grade);
      formData.append('nutriscore[2023][score]', nutriscoreData.score);
      
      // Images
      productData().images.forEach((image, index) => {
        formData.append(`images[${index}]`, image.file);
      });

      // Add app_name, app_version, and app_uuid
      formData.append('app_name', 'FoodFactsApp'); // Replace with your app name
      formData.append('app_version', '1.1'); // Replace with your app version
      formData.append('app_uuid', getAppUuid()); // Use the generated or stored UUID

      const response = await axios.post(
        'https://world.openfoodfacts.net/cgi/product_jqm2.pl',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      setContributionStatus({
        type: 'success',
        message: 'Product successfully contributed!'
      });

      // Reset form after successful submission
      setProductData(initialProductData);

    } catch (error) {
      console.error('Contribution Error:', error);
      setContributionStatus({
        type: 'error',
        message: error.response?.data?.message || 'Failed to contribute product. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const TagInput = ({ field, label, placeholder }) => (
    <div class="form-section">
      <label>{label}</label>
      <div class="multi-input-container">
        <input 
          type="text" 
          placeholder={placeholder}
          value={currentInput()[field] || ''}
          onInput={(e) => setCurrentInput(prev => ({ 
            ...prev, 
            [field]: e.target.value 
          }))}
          onKeyPress={(e) => e.key === 'Enter' && addTag(field, currentInput()[field] || '')}
        />
        <button 
          type="button"
          onClick={() => addTag(field, currentInput()[field] || '')}
          class="add-button"
          disabled={!(currentInput()[field] || '').trim()}
        >
          Add
        </button>
      </div>
      <div class="tags-container">
        {productData()[`${field}_tags`].map((tag) => (
          <div class="tag">
            <span>{tag.replace('en:', '')}</span>
            <button 
              type="button"
              onClick={() => removeTag(field, tag)}
              class="remove-tag"
              title="Remove tag"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div class="product-contribution-container">
      <h2>Contribute Product</h2>
      
      <form class="contribution-form" onSubmit={(e) => { e.preventDefault(); submitContribution(); }}>
        {contributionStatus() && (
          <div class={`contribution-status ${contributionStatus().type}`}>
            {contributionStatus().message}
          </div>
        )}

        <div class="form-section">
          <label>Barcode</label>
          <input type="text" value={productData().code} disabled />
        </div>

        <div class="form-section">
          <label>Product Name *</label>
          <input 
            type="text" 
            required
            placeholder="Enter product name"
            value={productData().product_name}
            onInput={(e) => handleInputChange('product_name', e.target.value)}
          />
        </div>

        <div class="form-section">
          <label>Creator *</label>
          <input 
            type="text" 
            required
            placeholder="Enter creator name"
            value={productData().creator}
            onInput={(e) => handleInputChange('creator', e.target.value)}
          />
        </div>

        <TagInput 
          field="data_sources"
          label="Data Sources" 
          placeholder="Enter data source"
        />

        <TagInput 
          field="brands"
          label="Brands *" 
          placeholder="Enter brand name"
        />

        <TagInput 
          field="categories"
          label="Categories" 
          placeholder="Enter category"
        />

        <TagInput 
          field="ingredients"
          label="Ingredients" 
          placeholder="Enter ingredient"
        />

        <div class="nutriscore-section">
          <h3>Nutriscore Information</h3>
          
          <div class="boolean-fields">
            {['is_beverage', 'is_cheese', 'is_fat', 'is_water'].map((field) => (
              <div class="form-section checkbox">
                <label>
                  <input 
                    type="checkbox"
                    checked={productData().nutriscore["2023"].data[field] === 1}
                    onChange={(e) => handleBooleanInput(field, e.target.checked)}
                  />
                  {field.replace(/_/g, ' ').charAt(0).toUpperCase() + field.replace(/_/g, ' ').slice(1)}
                </label>
              </div>
            ))}
          </div>

          {['energy', 'fiber', 'proteins', 'saturated_fat', 'sodium', 'sugars', 
            'fruits_vegetables_nuts_colza_walnut_olive_oils'].map((key) => (
            <div class="form-section">
              <label>{key.replace(/_/g, ' ').charAt(0).toUpperCase() + key.replace(/_/g, ' ').slice(1)}</label>
              <input 
                type="number" 
                step="0.1"
                min="0"
                placeholder={`Enter ${key.replace(/_/g, ' ')}`}
                value={productData().nutriscore["2023"].data[key]}
                onInput={(e) => handleNutriscoreInput(key, e.target.value)}
              />
            </div>
          ))}

          <div class="form-section">
            <label>Nutriscore Grade</label>
            <select 
              value={productData().nutriscore["2023"].grade}
              onChange={(e) => setProductData(prev => ({
                ...prev,
                nutriscore: {
                  ...prev.nutriscore,
                  "2023": {
                    ...prev.nutriscore["2023"],
                    grade: e.target.value
                  }
                }
              }))}
            >
              <option value="">Select Grade</option>
              {['a', 'b', 'c', 'd', 'e'].map(grade => (
                <option value={grade}>{grade.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        <div class="form-section">
          <label>Product Images</label>
          <input 
            type="file" 
            multiple 
            accept="image/*"
            onChange={handleImageUpload}
          />
          <div class="image-previews">
            {productData().images.map((image, index) => (
              <div class="image-preview-container">
                <img src={image.preview} alt={`Product Preview ${index + 1}`} class="image-preview" />
                <button
                  type="button"
                  class="remove-image"
                  onClick={() => setProductData(prev => ({
                    ...prev,
                    images: prev.images.filter((_, i) => i !== index)
                  }))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <button 
          type="submit"
          class="submit-btn" 
          disabled={isSubmitting() || !productData().product_name || !productData().creator || productData().brands_tags.length === 0}
        >
          {isSubmitting() ? 'Contributing...' : 'Contribute Product'}
        </button>
      </form>
    </div>
  );
};

export default ProductContribution;