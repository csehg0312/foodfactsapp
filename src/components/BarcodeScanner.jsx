import { createSignal, createEffect, Show } from "solid-js";
import DataVisualizer from "./DataVisualizer";
import Quagga from "quagga";
import "./BarcodeScanner.css";
import ProductContribution from './ProductContribution';

const BarcodeScanner = () => {

  // const openFoodFactsClient = createOpenFoodFactsClient();

  const [barcodeData, setBarcodeData] = createSignal(null);
  const [imagePreview, setImagePreview] = createSignal(null);
  const [scanError, setScanError] = createSignal(null);
  const [isScanning, setIsScanning] = createSignal(false);
  const [productFound, setProductFound] = createSignal(false);

  const handleFileInput = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Reset states
      setImagePreview(null);
      setScanError(null);
      setIsScanning(true);
      setProductFound(false);
      setBarcodeData(null);

      // Create image preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Decode barcode
      decodeBarcode(file);
    }
  };

  const decodeBarcode = (imageFile) => {
    return new Promise((resolve, reject) => {
      Quagga.decodeSingle(
        {
          src: URL.createObjectURL(imageFile),
          numOfWorkers: navigator.hardwareConcurrency || 4,
          locate: true,
          inputStream: {
            size: 800,
            singleChannel: true // try processing color image
          },
          locator: {
            patchSize: "medium",
            halfSample: true
          },
          decoder: {
            readers: [
              "ean_reader",
              "ean_8_reader",
              "code_128_reader",
              "code_39_reader",
              "code_39_vin_reader",
              "upc_reader",
              "upc_e_reader"
              // "ean_13_reader"
            ]
          },
          debug: {
            drawBoundingBox: true,
            showFrequency: true,
            drawScanline: true
          }
        },
        (result) => {
          setIsScanning(false);
          
          if (result && result.codeResult) {
            console.log("Barcode detected:", result.codeResult.code);
            setBarcodeData(result.codeResult.code);
            setScanError(null);
            resolve(result.codeResult.code);
          } else {
            console.warn("No barcode detected");
            setScanError("No barcode detected. Please try a different image.");
            reject(new Error("No barcode detected"));
          }
        }
      );
    });
  };

  const clearScanner = () => {
    setBarcodeData(null);
    setImagePreview(null);
    setScanError(null);
    setProductFound(false);
  };

  // Optional: Add live video scanning capability
  const startLiveScanning = async () => {
    const supports = navigator.mediaDevices.getSupportedConstraints();
    if (!supports.facingMode) {
      setScanError("Live scanning is not supported on this device.");
      return;
    }
  
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
  
      const videoElement = document.querySelector('camera-preview');
      if (!videoElement) {
        setScanError("Live scanning is not supported on this device.");
        stream.getTracks().forEach(track => track.stop()); // Stop the video stream
        return;
      }
  
      videoElement.srcObject = stream;
  
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: videoElement
        },
        locator: {
          patchSize: "medium",
          halfSample: true
        },
        numOfWorkers: navigator.hardwareConcurrency || 4,
        decoder: {
          readers: [
            "ean_reader",
            "ean_8_reader",
            "ean_13_reader",
            "code_128_reader",
            "code_39_reader",
            "upc_reader",
            "upc_e_reader"
          ]
        },
        locate: true
      }, (err) => {
        if (err) {
          console.error("Initialization error:", err);
          setScanError("Error initializing Quagga.");
          Quagga.stop(); // Stop Quagga if initialization fails
          stream.getTracks().forEach(track => track.stop()); // Stop the video stream
          return;
        }
        Quagga.start();
      });
  
      Quagga.onDetected((result) => {
        if (result && result.codeResult) {
          setBarcodeData(result.codeResult.code);
          Quagga.stop(); // Stop scanning after detecting a barcode
        }
      });
  
      videoElement.addEventListener('error', () => {
        setScanError("Error starting video stream.");
        Quagga.stop(); // Stop Quagga if video stream fails
        stream.getTracks().forEach(track => track.stop()); // Stop the video stream
      });
    } catch (error) {
      setScanError("Error starting live scanning.");
      Quagga.stop(); // Stop Quagga if getUserMedia fails
    }
  };
  return (
    <div class="barcode-scanner-container">
      <div class="scanner-card">
        <h2 class="scanner-title">Barcode Scanner</h2>
        
        {/* File Input Section */}
        <div class="file-input-wrapper">
          <input 
            type="file" 
            id="barcode-file-input"
            accept="image/*" 
            onChange={handleFileInput}
            class="file-input"
          />
          <label for="barcode-file-input" class="file-input-label">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
            </svg>
            Choose Image
          </label>
          <button onClick={startLiveScanning} class="live-scan-button">
            Live Scan
          </button>
        </div>
        <div id="camera-preview" style="display: none;"></div>

        {/* Image Preview and Scanning State */}
        <Show when={imagePreview()}>
          <div class="image-preview-container">
            <img 
              src={imagePreview()} 
              alt="Barcode Preview" 
              class="image-preview"
            />
            {isScanning() && (
              <div class="scanning-overlay">
                <div class="spinner"></div>
                <p>Scanning barcode...</p>
              </div>
            )}
          </div>
        </Show>

        {/* Manual Barcode Input */}
        <div class="manual-input-section">
          <h3>Or Enter Barcode Manually</h3>
          <div class="manual-input-wrapper">
            <input
              type="text"
              placeholder="Enter barcode number"
              value={barcodeData() || ''}
              onInput={(e) => {
                // Only reset specific states
                setScanError(null);
                setProductFound(false);
                setBarcodeData(e.target.value);
              }}
              class="manual-input"
            />
            <Show when={barcodeData()}>
              <button onClick={clearScanner} class="clear-button">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </Show>
          </div>
        </div>

        {/* Error Message */}
        <Show when={scanError()}>
          <div class="error-message">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L1 21h22L12 2zm1 16h-2v-2h2v2zm0-4h-2V7h2v7z"/>
            </svg>
            <p>{scanError()}</p>
          </div>
        </Show>

        {/* Barcode Display */}
        <Show when={barcodeData()}>
          <div class="barcode-display">
            <h3>Scanned Barcode:</h3>
            <p class="barcode-number">{barcodeData()}</p>
          </div>
        </Show>

        {/* Product Visualizer */}
        <Show when={barcodeData()}>
          <DataVisualizer 
            barcode={barcodeData()} 
            onProductFound={() => setProductFound(true)}
            onProductError={(error) => {
              setScanError(error);
              // Do not clear barcodeData
            }}
          />
        </Show>
        {/* <Show when={barcodeData() && !productFound()}>
          <ProductContribution barcode={barcodeData()} />
        </Show> */}
      </div>
    </div>
  );
};

export default BarcodeScanner;