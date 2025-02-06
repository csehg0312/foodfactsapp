import { createSignal, createEffect, Show } from 'solid-js';
import axios from 'axios';
import './DataVisualizer.css';

// Create a custom axios instance with a predefined User-Agent
const createOpenFoodFactsClient = () => {
    const APP_NAME = 'BarcodeScannerApp';
    const APP_VERSION = '1.0';
    const CONTACT_EMAIL = 'csgabor.levelupdigital@gmail.com';
  
    return axios.create({
      baseURL: 'https://world.openfoodfacts.org/api/v2/product',
      headers: {
        'User-Agent': `${APP_NAME}/${APP_VERSION} (${CONTACT_EMAIL})`,
        // Optional: Add additional headers if needed
        'Accept': 'application/json',
      },
      // Optional: Add timeout and other configurations
      timeout: 10000,
    });
  };


const DataVisualizer = (props) => {
  const [productData, setProductData] = createSignal(null);
  const [errorMessage, setErrorMessage] = createSignal(null);
  const [isLoading, setIsLoading] = createSignal(false);

//   const apiUrl = "https://world.openfoodfacts.org/api/v2/product";
  const openFoodFactsClient = createOpenFoodFactsClient();

  // Nutrition grade color mapping function
  const getNutritionGradeColor = (grade) => {
    const gradeColors = {
      'a': 'nutrition-grade-a',
      'b': 'nutrition-grade-b',
      'c': 'nutrition-grade-c',
      'd': 'nutrition-grade-d',
      'e': 'nutrition-grade-e'
    };
    return gradeColors[grade?.toLowerCase()] || '';
  };

  // Truncate long text with ellipsis
  const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    return text.length > maxLength 
      ? `${text.substring(0, maxLength)}...` 
      : text;
  };

  // Tooltip component for long text
  const TextWithTooltip = (props) => {
    const [isExpanded, setIsExpanded] = createSignal(false);
  
    // Ensure children is always a string
    const displayText = () => {
      const text = props.children;
      return text == null ? '' : String(text);
    };
  
    const canExpand = () => {
      const text = displayText();
      return text.length > 50;
    };
  
    return (
      <div 
        class="tooltip-container"
        onClick={() => canExpand() && setIsExpanded(!isExpanded())}
      >
        <span class="tooltip-text">
          {isExpanded() ? displayText() : truncateText(displayText())}
        </span>
        {canExpand() && (
          <span class="tooltip-icon">
            {isExpanded() ? '▼' : '►'}
          </span>
        )}
      </div>
    );
  };

  const loadProduct = async () => {
    setProductData(null);
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (!props.barcode) {
        throw new Error("Barcode is null");
      }

      // Use the custom client for the API request
      const response = await openFoodFactsClient.get(`/${props.barcode}.json`);
      
      console.log("Full API Response:", response.data);

      // Validate product data
      if (!response.data.product) {
        throw new Error(`No product data found for barcode: ${props.barcode}`);
      }

      // Rest of the existing code remains the same...
      const product = response.data.product;
      const processedData = {
        name: product.product_name || 'Unknown Product',
        brands: product.brands || 'N/A',
        categories: product.categories || 'N/A',
        ingredients: Array.isArray(product.ingredients_tags) && product.ingredients_tags.length > 0 
                      ? product.ingredients_tags.join(', ') 
                      : 'N/A',
        nutritionGrade: product.nutrition_grades || 'N/A',
        
        nutrition: {
          energy: product.nutriments?.energy || product.nutriments?.['energy-kcal'] || 'N/A',
          proteins: product.nutriments?.proteins || 'N/A',
          carbohydrates: product.nutriments?.carbohydrates || 'N/A',
          sugars: product.nutriments?.sugars || 'N/A',
          fat: product.nutriments?.fat || 'N/A',
          saturatedFat: product.nutriments?.['saturated-fat'] || 'N/A',
        },
      
        images: {
          front: product.selected_images?.front?.display?.['en'] || 
                 product.image_front_url || 
                 null,
        },
      
        allergens: product.allergens_hierarchy || [],
        labels: product.labels_hierarchy || [],
      };

      setProductData(processedData);

      // Callback for successful product fetch
      if (props.onProductFound) {
        props.onProductFound(processedData);
      }

    } catch (error) {
      console.error("Product Fetch Error:", error);
      
      const errorMsg = error.response 
        ? `API Error: ${error.response.status} - ${error.response.statusText}`
        : error.message;
      
      setErrorMessage(errorMsg);

      // Callback for error
      if (props.onProductError) {
        props.onProductError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Create effect to load product when barcode changes
  createEffect(() => {
    if (props.barcode) {
      loadProduct();
    }
  });

  return (
    <div class="data-visualizer-container">
      <Show when={isLoading()}>
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>Loading product information...</p>
        </div>
      </Show>

      <Show when={errorMessage()}>
        <div class="error-message">
          <p>{errorMessage()}</p>
        </div>
      </Show>

      <Show when={productData()}>
        <div class="product-details">
          <h2 class="product-name">{productData().name}</h2>
          
          <div class="product-summary">
            {/* Nutrition Grade with Color */}
            <div class={`nutrition-grade ${getNutritionGradeColor(productData().nutritionGrade)}`}>
              Nutrition Grade: {productData().nutritionGrade.toUpperCase()}
            </div>

            {/* Responsive Product Details */}
            <div class="product-info-grid">
              <div class="product-info-item">
                <strong>Brand:</strong>
                <TextWithTooltip>{productData().brands}</TextWithTooltip>
              </div>

              <div class="product-info-item categories-container">
                <strong>Categories:</strong>
                <div class="categories-list">
                  {(productData().categories || '')
                    .split(',')
                    .map(category => category.trim())
                    .filter(category => category)
                    .map((category) => (
                      <span class="category-chip">{truncateText(category, 30)}</span>
                    ))
                }
                </div>
              </div>

              <div class="product-info-item">
                <strong>Packaging:</strong>
                <TextWithTooltip>{productData().packaging}</TextWithTooltip>
              </div>

              <div class="product-info-item">
                <strong>Origin:</strong>
                <TextWithTooltip>{productData().countries}</TextWithTooltip>
              </div>
            </div>

            {/* Product Image */}
            {productData().images.front && (
              <div class="product-image-container">
                <img 
                  src={productData().images.front} 
                  alt={productData().name} 
                  class="product-image"
                />
              </div>
            )}

            {/* Nutrition Details */}
            <div class="nutrition-details">
              <h3>Nutrition Information</h3>
              <div class="nutrition-grid">
                {Object.entries(productData().nutrition).map(([key, value]) => (
                  <div class="nutrition-item">
                    <span class="nutrition-label">
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </span>
                    <span class="nutrition-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Allergens and Labels with Responsive Handling */}
            <Show when={productData().ingredients.length > 0}>
              <div class="additional-info">
                <h3>Ingredients</h3>
                <div class="ingredients-container">
                  {(productData().ingredients || "")
                    .split(',')
                    .map(ingredient => ingredient.trim())
                    .filter(ingredient => ingredient)
                    .map((ingredient) => {
                      // Remove the 'en:' prefix if it exists
                      const cleanedIngredient = ingredient.replace(/^en:\s*/, '');
                      return (
                        <span class="category-chip">{truncateText(cleanedIngredient, 30)}</span>
                      );
                    })
                  }
                </div>
              </div>
            </Show>

            <Show when={productData().allergens.length > 0}>
              <div class="additional-info">
                <h3>Allergens</h3>
                <div class="scrollable-list">
                  {productData().allergens.map((allergen) => (
                    <span class="info-chip">{truncateText(allergen)}</span>
                  ))}
                </div>
              </div>
            </Show>

            <Show when={productData().labels.length > 0}>
                <div class="additional-info labels-section">
                    <h3>Labels</h3>
                    <ul class="labels-list">
                    {productData().labels.map((label) => (
                        <li class="label-item">
                        <span class="label-text">{truncateText(label, 100)}</span>
                        </li>
                    ))}
                    </ul>
                </div>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default DataVisualizer;