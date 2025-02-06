import { createSignal } from 'solid-js';
import axios from 'axios';
import './ProductContribution.css';

const ProductContribution = (props) => {
  const initialProductData = {
    code: props.barcode || '',
    product_name: '',
    brands: '',
    categories: '',
    packaging: '',
    labels: '',
    nutrition_grades: '',
    allergens: '',
    ingredients: '',
    nutriments: {
      data: [
        {
          sugars: 0,
          salt: 0,
          proteins: 0,
          'saturated-fat': 0,
          energy: 0
        }
      ]
    },
    images: []
  };

  const [productData, setProductData] = createSignal(initialProductData);
  const [currentInput, setCurrentInput] = createSignal({
    brand: '',
    category: '',
    packaging: '',
    label: '',
    allergen: '',
    ingredient: ''
  });

  const [contributionStatus, setContributionStatus] = createSignal(null);

  const nutritionGrades = ['A', 'B', 'C', 'D', 'E', 'UNKNOWN'];

  const addItemToField = (field, value) => {
    if (!value.trim()) return;

    setProductData(prev => ({
      ...prev,
      [field]: prev[field] ? `${prev[field]}, ${value.trim()}` : value.trim()
    }));

    setCurrentInput(prev => ({
      ...prev,
      [field.slice(0, -1)]: ''
    }));
  };

  const removeItemFromField = (field, itemToRemove) => {
    setProductData(prev => {
      const items = prev[field].split(',').map(item => item.trim());
      const filteredItems = items.filter(item => item !== itemToRemove);
      return {
        ...prev,
        [field]: filteredItems.join(', ')
      };
    });
  };

  const getArrayFromField = (field) => {
    if (!productData()[field]) return [];
    return productData()[field].split(',').map(item => item.trim()).filter(item => item);
  };

  const handleInputChange = (field, value) => {
    setProductData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNutriscoreInput = (key, value) => {
    setProductData(prev => {
      const updatedNutriscore = prev.nutriments.data[0];
      return {
        ...prev,
        nutriments: {
          data: [{
            ...updatedNutriscore,
            [key]: value
          }]
        }
      };
    });
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
      if (!productData().product_name || !productData().brands) {
        setContributionStatus({
          type: 'error',
          message: 'Please fill in at least the name and a brand'
        });
        return;
      }
  
      const formData = new FormData();
      formData.append('code', productData().code);
      formData.append('product_name', productData().product_name);
      formData.append('brands', `en:${productData().brands}`);
      formData.append('categories', `en:${productData().categories}`);
      formData.append('packaging', `en:${productData().packaging}`);
      formData.append('labels', `en:${productData().labels}`);
      formData.append('nutrition_grades', `en:${productData().nutrition_grades}`);
      formData.append('allergens', `en:${productData().allergens}`);
      formData.append('ingredients_tags', `en:${productData().ingredients}`);
  
      const nutriscoreData = productData().nutriments.data[0];
      formData.append('nutriments[sugars]', nutriscoreData.sugars || 0);
      formData.append('nutriments[salt]', nutriscoreData.salt || 0);
      formData.append('nutriments[proteins]', nutriscoreData.proteins || 0);
      formData.append('nutriments[saturated-fat]', nutriscoreData['saturated-fat'] || 0);
      formData.append('nutriments[energy-kcal]', nutriscoreData.energy || 0);
  
      productData().images.forEach((image, index) => {
        formData.append(`image_${index}`, image.file);
      });
  
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

  const TagInput = ({ field, label, placeholder }) => (
    <div class="form-section">
      <label>{label}</label>
      <div class="multi-input-container">
        <input 
          type="text" 
          placeholder={placeholder}
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
      <div class="tags-container">
        {getArrayFromField(field).map((item) => (
          <div class="tag">
            <span>{item}</span>
            <button 
              onClick={() => removeItemFromField(field, item)}
              class="remove-tag"
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
      <h2>Contribute Missing Product</h2>
      
      <div class="contribution-form">
        <div class="form-section">
          <label>Barcode</label>
          <input 
            type="text" 
            value={productData().code} 
            disabled 
          />
        </div>

        <div class="form-section">
          <label>Product Name *</label>
          <input 
            type="text" 
            placeholder="Enter product name"
            value={productData().product_name}
            onInput={(e) => handleInputChange('product_name', e.target.value)}
          />
        </div>

        <TagInput 
          field="brands" 
          label="Brands *" 
          placeholder="Enter brand name"
        />

        <TagInput 
          field="categories" 
          label="Categories" 
          placeholder="Enter category name"
        />

        <TagInput 
          field="packaging" 
          label="Packaging" 
          placeholder="Enter packaging type"
        />

        <TagInput 
          field="labels" 
          label="Labels" 
          placeholder="Enter label name"
        />

        <TagInput 
          field="allergens" 
          label="Allergens" 
          placeholder="Enter allergen name"
        />

        <TagInput 
          field="ingredients" 
          label="Ingredients" 
          placeholder="Enter ingredient name"
        />

        <div class="form-section">
          <label>Nutrition Grade</label>
          <select 
            value={productData().nutrition_grades}
            onChange={(e) => handleInputChange('nutrition_grades', e.target.value)}
          >
            <option value="">Select Grade</option>
            {nutritionGrades.map(grade => (
              <option value={grade} key={grade}>{grade}</option>
            ))}
          </select>
        </div>

        <div class="nutrition-section">
          <h3>Nutriscore Information</h3>
          {Object.keys(productData().nutriments.data[0]).map((key) => (
            <div class="form-section">
              <label>{key.charAt(0).toUpperCase() + key.replace(/-/g, ' ').slice(1)}</label>
              <input 
                type="number" 
                step="0.01"
                placeholder={`Enter ${key.replace(/-/g, ' ')}`}
                value={productData().nutriments.data[0][key]}
                onInput={(e) => handleNutriscoreInput(key, e.target.value)}
              />
            </div>
          ))}
        </div>

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