import { createSignal, createEffect, For } from 'solid-js';
import axios from 'axios';
import './ProductContribution.css';

const ProductContribution = (props) => {
  const [productData, setProductData] = createSignal({
    barcode: props.barcode || '',
    name: '',
    brands: [], // Changed to array for multiple brands
    categories: [], // Changed to array for multiple categories
    packaging: [], // Added packaging as array
    labels: [], // Added labels
    nutritionGrade: '', // Added nutrition grade
    nutrition: {
      sugar: 0,
      salt: 0,
      proteins: 0,
      saturatedFat: 0,
      calories: 0
    },
    images: [],
    allergens: [] // Optional: added allergens
  });

  const [currentInput, setCurrentInput] = createSignal({
    brand: '',
    category: '',
    packaging: '',
    label: '',
    allergen: ''
  });

  const [imagePreview, setImagePreview] = createSignal(null);
  const [contributionStatus, setContributionStatus] = createSignal(null);

  // Nutrition grade options
  const nutritionGrades = ['A', 'B', 'C', 'D', 'E', 'UNKNOWN'];

  // Generic method to add items to array fields
  const addItemToField = (field, value) => {
    if (!value.trim()) return;

    setProductData(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), value.trim()]
    }));

    // Reset current input for the specific field
    setCurrentInput(prev => ({
      ...prev,
      [field.slice(0, -1)]: ''
    }));
  };

  // Method to remove item from array fields
  const removeItemFromField = (field, index) => {
    setProductData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleInputChange = (field, value) => {
    setProductData(prev => {
      const updated = { ...prev };
      
      // Handle nested nutrition data with float conversion
      if (field.startsWith('nutrition.')) {
        const nutritionField = field.split('.')[1];
        updated.nutrition[nutritionField] = parseFloat(value) || 0;
      } else {
        updated[field] = value;
      }
      
      return updated;
    });
  };

  const handleNutritionInput = (key, value) => {
    // Directly set the input value without immediate conversion
    setProductData(prev => ({
      ...prev,
      nutrition: {
        ...prev.nutrition,
        [key]: value  // Keep as string
      }
    }));
  };
  

  const handleImageUpload = (event) => {
    const files = event.target.files;
    const previews = [];
    
    for (let file of files) {
      const reader = new FileReader();
      reader.onloadend = () => {
        previews.push({
          file: file,
          preview: reader.result
        });
        setProductData(prev => ({ ...prev, images: previews }));
      };
      reader.readAsDataURL(file);
    }
  };

  const submitContribution = async () => {
    try {
      // Validate required fields
      if (!productData().name || productData().brands.length === 0) {
        setContributionStatus({
          type: 'error',
          message: 'Please fill in at least the name and a brand'
        });
        return;
      }

      // Prepare form data for OpenFoodFacts API
      const formData = new FormData();
      
      // Add text data
      formData.append('product_name', productData().name);
      formData.append('brands', productData().brands.join(','));
      formData.append('code', productData().barcode);
      formData.append('categories', productData().categories.join(','));
      formData.append('packaging', productData().packaging.join(','));
      formData.append('labels', productData().labels.join(','));
      formData.append('nutrition_grades', productData().nutritionGrade);

      // Add nutrition data
      const nutrition = productData().nutrition;
      formData.append('nutrition_data_per', 'serving');
      formData.append('nutrition_sugars', nutrition.sugar);
      formData.append('nutrition_salt', nutrition.salt);
      formData.append('nutrition_proteins', nutrition.proteins);
      formData.append('nutrition_saturated-fat', nutrition.saturatedFat);
      formData.append('nutrition_energy', nutrition.calories);

      // Add images
      productData().images.forEach((image, index) => {
        formData.append(`image_${index}`, image.file);
      });

      // Send contribution to OpenFoodFacts
      const response = await axios.post(
        'https://world.openfoodfacts.org/cgi/product_jqm2.pl', 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setContributionStatus({
        type: 'success',
        message: 'Product successfully contributed!'
      });

    } catch (error) {
      console.error('Contribution Error:', error);
      setContributionStatus({
        type: 'error',
        message: 'Failed to contribute product. Please try again.'
      });
    }
  };

  return (
    <div class="product-contribution-container">
      <h2>Contribute Missing Product</h2>
      
      <div class="contribution-form">
        {/* Existing barcode and product name inputs */}
        <div class="form-section">
          <label>Barcode</label>
          <input 
            type="text" 
            value={productData().barcode} 
            disabled 
          />
        </div>

        <div class="form-section">
          <label>Product Name *</label>
          <input 
            type="text" 
            placeholder="Enter product name"
            value={productData().name}
            onInput={(e) => handleInputChange('name', e.target.value)}
          />
        </div>

        {/* Brands Section with Multiple Input */}
        <div class="form-section">
          <label>Brands *</label>
          <div class="multi-input-container">
            <input 
              type="text" 
              placeholder="Enter brand name"
              value={currentInput().brand}
              onInput={(e) => setCurrentInput(prev => ({ ...prev, brand: e.target.value }))}
              onKeyPress={(e) => e.key === 'Enter' && addItemToField('brands', currentInput().brand)}
            />
            <button 
              onClick={() => addItemToField('brands', currentInput().brand)}
              class="add-button"
            >
              Add Brand
            </button>
          </div>
          <div class="input-chips">
            <For each={productData().brands}>
              {(brand, index) => (
                <span class="chip">
                  {brand}
                  <button 
                    class="remove-chip" 
                    onClick={() => removeItemFromField('brands', index())}
                  >
                    ×
                  </button>
                </span>
              )}
            </For>
          </div>
        </div>

        {/* Similar multi-input sections for Categories, Packaging, Labels */}
        {['categories', 'packaging', 'labels', 'allergens'].map(field => (
          <div class="form-section">
            <label>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
            <div class="multi-input-container">
              <input 
                type="text" 
                placeholder={`Enter ${field.slice(0, -1)} name`}
                value={currentInput()[field.slice(0, -1)]}
                onInput={(e) => setCurrentInput(prev => ({ ...prev, [field.slice(0, -1)]: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && addItemToField(field, currentInput()[field.slice(0, -1)])}
              />
              <button 
                onClick={() => addItemToField(field, currentInput()[field.slice(0, -1)])}
                class="add-button"
              >
                Add {field.slice(0, -1)}
              </button>
            </div>
            <div class="input-chips">
              <For each={productData()[field]}>
                {(item, index) => (
                  <span class="chip">
                    {item}
                    <button 
                      class="remove-chip" 
                      onClick={() => removeItemFromField(field, index())}
                    >
                      ×
                    </button>
                  </span>
                )}
              </For>
            </div>
          </div>
        ))}

        {/* Nutrition Grade Selection */}
        <div class="form-section">
          <label>Nutrition Grade</label>
          <select 
            value={productData().nutritionGrade}
            onChange={(e) => handleInputChange('nutritionGrade', e.target.value)}
          >
            <option value="">Select Grade</option>
            {nutritionGrades.map(grade => (
              <option value={grade} key={grade}>{grade}</option>
            ))}
          </select>
        </div>

        {/* Nutrition Information Section */}
        <div class="nutrition-section">
          <h3>Nutrition Information</h3>
          {Object.keys(productData().nutrition).map((key) => (
            <div class="form-section">
              <label>{key.charAt(0).toUpperCase() + key.replace(/_/g, ' ').slice(1)}</label>
              <input 
                type="text"  // Use text type for more flexible input
                inputMode="decimal"  // Provides appropriate mobile keyboard
                pattern="[0-9]*([.,][0-9]+)?"  // Allows decimal input
                placeholder={`Enter ${key.replace(/_/g, ' ')}`}
                value={productData().nutrition[key] ?? ''}
                onInput={(e) => {
                    // Directly pass the input value
                    handleNutritionInput(key, e.target.value);
                }}
                />
            </div>
          ))}
        </div>

        {/* Product Images Section */}
        <div class="form-section">
          <label>Product Images</label>
          <input 
            type="file" 
            multiple 
            accept="image/*"
            onChange={handleImageUpload}
          />
        </div>

        {productData().images.length > 0 && (
          <div class="image-previews">
            {productData().images.map((image) => (
              <img 
                src={image.preview} 
                alt="Product Preview" 
                class="image-preview" 
              />
            ))}
          </div>
        )}

        <button 
          class="submit-btn" 
          onClick={submitContribution}
        >
          Contribute Product
        </button>

        {contributionStatus() && (
          <div 
            class={`status-message ${contributionStatus().type}`}
          >
            {contributionStatus().message}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductContribution;