import { createSignal, createEffect, Show } from 'solid-js';
import axios from 'axios';
import './DataVisualizer.css';

const createOpenFoodFactsClient = () => {
    const APP_NAME = 'FoodFactsApp';
    const APP_VERSION = '1.0';
    const CONTACT_EMAIL = 'csgabor.levelupdigital@gmail.com';
  
    return axios.create({
      baseURL: 'https://world.openfoodfacts.net/api/v2/product',
      headers: {
        'User-Agent': `${APP_NAME}/${APP_VERSION} (${CONTACT_EMAIL})`,
        'Accept': 'application/json',
      },
      timeout: 10000,
    });
  };

const DataVisualizer = (props) => {
  const [productData, setProductData] = createSignal(null);
  const [errorMessage, setErrorMessage] = createSignal(null);
  const [isLoading, setIsLoading] = createSignal(false);

  const openFoodFactsClient = createOpenFoodFactsClient();

  // Process Nutriscore data from both formats and nutriments
  const processNutritionData = (product) => {
    const nutriscore = product.nutriscore;
    const nutriments = product.nutriments;
    const version = product.nutriscore_version;
  
    // Process allergens and ingredients
    const processedAllergens = product.allergens_from_ingredients
      ? product.allergens_from_ingredients.split(',').map(a => a.trim())
      : [];
  
    const processedCategories = product.categories
      ? product.categories.split(',').map(c => c.trim())
      : [];
  
    // First try to get nutriscore data using the specified version
    if (nutriscore && version && nutriscore[version]) {
      const data = nutriscore[version];
  
      // Process 2023 and newer format
      if (parseInt(version) >= 2023 && data?.data?.components) {
        const components = data.data.components;
  
        // Helper to get component details
        const getComponent = (type, id) => {
          const component = components[type]?.find(c => c.id === id);
          return component ? {
            value: component.value,
            points: component.points,
            max_points: component.points_max,
            unit: component.unit
          } : null;
        };
  
        return {
          source: `nutriscore_${version}`,
          grade: data.grade || 'unknown',
          score: data.score || null,
          version: version,
          components: {
            energy: getComponent('negative', 'energy'),
            sugars: getComponent('negative', 'sugars'),
            saturatedFat: getComponent('negative', 'saturated_fat'),
            salt: getComponent('negative', 'salt'),
            fiber: getComponent('positive', 'fiber'),
            fruitsVegetables: getComponent('positive', 'fruits_vegetables_legumes'),
            proteins: getComponent('positive', 'proteins'), // Extract proteins from positive
          },
          scoring: {
            negative_points: data.data.negative_points,
            negative_points_max: data.data.negative_points_max,
            positive_points: data.data.positive_points,
            positive_points_max: data.data.positive_points_max,
            count_proteins: data.data.count_proteins,
            count_proteins_reason: data.data.count_proteins_reason
          },
          product_type: {
            is_beverage: data.data.is_beverage,
            is_cheese: data.data.is_cheese,
            is_fat_oil_nuts_seeds: data.data.is_fat_oil_nuts_seeds,
            is_red_meat_product: data.data.is_red_meat_product,
            is_water: data.data.is_water
          },
          nutrition_data_per: product.nutrition_data_per || "100g",
          applicable: data.nutriscore_applicable || false,
          computed: data.nutriscore_computed || false,
          allergens: processedAllergens,
          categories: processedCategories,
          ingredients: product.ingredients_tags || []
        };
      } 
      // Process pre-2023 format
      else if (data?.data) {
        return {
          source: `nutriscore_${version}`,
          grade: data.grade || 'unknown',
          score: data.score || null,
          version: version,
          components: {
            energy: {
              value: data.data.energy_value,
              points: data.data.energy_points,
              max_points: 10,
              unit: 'kJ'
            },
            sugars: {
              value: data.data.sugars_value,
              points: data.data.sugars_points,
              max_points: 10,
              unit: 'g'
            },
            saturatedFat: {
              value: data.data.saturated_fat_value,
              points: data.data.saturated_fat_points,
              max_points: 10,
              unit: 'g'
            },
            sodium: {
              value: data.data.sodium_value,
              points: data.data.sodium_points,
              max_points: 10,
              unit: 'mg'
            },
            fiber: {
              value: data.data.fiber_value,
              points: data.data.fiber_points,
              max_points: 5,
              unit: 'g'
            },
            fruitsVegetables: {
              value: data.data.fruits_vegetables_nuts_colza_walnut_olive_oils_value,
              points: data.data.fruits_vegetables_nuts_colza_walnut_olive_oils_points,
              max_points: 5,
              unit: '%'
            },
            proteins: {
              value: data.data.proteins_value,
              points: data.data.proteins_points,
              max_points: 5,
              unit: 'g'
            }
          },
          scoring: {
            negative_points: data.data.negative_points,
            positive_points: data.data.positive_points
          },
          product_type: {
            is_beverage: data.data.is_beverage,
            is_cheese: data.data.is_cheese,
            is_fat: data.data.is_fat,
            is_water: data.data.is_water
          },
          nutrition_data_per: product.nutrition_data_per || "100g",
          applicable: data.nutriscore_applicable || false,
          computed: data.nutriscore_computed || false,
          allergens: processedAllergens,
          categories: processedCategories,
          ingredients: product.ingredients_tags || []
        };
      }
    }
  
    // Return default structure if no nutrition data is available
    return {
      source: 'none',
      grade: 'unknown',
      score: null,
      version: null,
      components: {},
      scoring: {},
      product_type: {},
      nutrition_data_per: "100g",
      applicable: false,
      computed: false,
      allergens: processedAllergens,
      categories: processedCategories,
      ingredients: product.ingredients_tags || []
    };
  };

  const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    return text.length > maxLength 
      ? `${text.substring(0, maxLength)}...` 
      : text;
  };

  const formatNutritionValue = (value, unit, defaultValue = 'N/A') => {
    if (value === null || value === undefined) return defaultValue;
    return `${value} ${unit}`;
  };

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

  const loadProduct = async () => {
    setProductData(null);
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (!props.barcode) {
        throw new Error("Barcode is null");
      }

      const response = await openFoodFactsClient.get(`/${props.barcode}.json`);
      
      if (!response.data.product) {
        throw new Error(`No product data found for barcode: ${props.barcode}`);
      }

      const product = response.data.product;
      const nutritionData = processNutritionData(product);

      const processedData = {
        name: product.product_name || 'Unknown Product',
        keywords: product._keywords || [],
        brands: product.brands || 'N/A',
        categories: product.categories || 'N/A',
        nutritionGrade: nutritionData.grade,
        nutritionDataSource: nutritionData.source,
        nutrition: {
          energy: formatNutritionValue(nutritionData.components.energy?.value, nutritionData.components.energy?.unit),
          proteins: formatNutritionValue(nutritionData.components.proteins?.value, nutritionData.components.proteins?.unit),
          sugars: formatNutritionValue(nutritionData.components.sugars?.value, nutritionData.components.sugars?.unit),
          saturatedFat: formatNutritionValue(nutritionData.components.saturatedFat?.value, nutritionData.components.saturatedFat?.unit),
          salt: formatNutritionValue(nutritionData.components.salt?.value, nutritionData.components.salt?.unit),
          fiber: formatNutritionValue(nutritionData.components.fiber?.value, nutritionData.components.fiber?.unit),
          fruitsVegetables: formatNutritionValue(nutritionData.components.fruitsVegetables?.value, nutritionData.components.fruitsVegetables?.unit),
        },
        nutriscoreDetails: nutritionData.score !== null ? {
          score: nutritionData.score,
          negativePoints: nutritionData.scoring.negative_points,
          positivePoints: nutritionData.scoring.positive_points,
        } : null,
      };

      setProductData(processedData);
      if (props.onProductFound) {
        props.onProductFound(processedData);
      }

    } catch (error) {
      console.error("Product Fetch Error:", error);
      const errorMsg = error.response 
        ? `API Error: ${error.response.status} - ${error.response.statusText}`
        : error.message;
      setErrorMessage(errorMsg);
      if (props.onProductError) {
        props.onProductError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

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
            <div class={`nutrition-grade ${getNutritionGradeColor(productData().nutritionGrade)}`}>
              <div class="grade-header">
                Nutrition Grade: {productData().nutritionGrade.toUpperCase()}
                <span class="data-source">
                  (Source: {productData().nutritionDataSource})
                </span>
              </div>
              
              <Show when={productData().nutriscoreDetails}>
                <div class="nutriscore-details">
                  <p>Score: {productData().nutriscoreDetails.score}</p>
                  <p>Negative Points: {productData().nutriscoreDetails.negativePoints}</p>
                  <p>Positive Points: {productData().nutriscoreDetails.positivePoints}</p>
                </div>
              </Show>
            </div>

            <Show when={productData().keywords.length > 0}>
              <div class="additional-info">
                <h3>Keywords</h3>
                <div class="scrollable-list">
                  {productData().keywords.map((keyword) => (
                    <span class="category-chip">{truncateText(keyword)}</span>
                  ))}
                </div>
              </div>
            </Show>

            <div class="nutrition-details">
              <h3>Nutrition Information</h3>
              <div class="nutrition-grid">
                {Object.entries(productData().nutrition).map(([key, value]) => (
                  <div class="nutrition-item">
                    <span class="nutrition-label">
                      {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                    </span>
                    <span class="nutrition-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default DataVisualizer;