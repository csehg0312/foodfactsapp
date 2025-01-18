import { createSignal, createEffect, Show, onCleanup } from "solid-js";
import DataVisualizer from "./DataVisualizer";
import Quagga from "quagga";
import "./BarcodeScanner.css";
import ProductContribution from './ProductContribution';

const BarcodeScanner = () => {
  const [barcodeData, setBarcodeData] = createSignal(null);
  const [imagePreview, setImagePreview] = createSignal(null);
  const [scanError, setScanError] = createSignal(null);
  const [isScanning, setIsScanning] = createSignal(false);
  const [productFound, setProductFound] = createSignal(false);
  const [cameraStream, setCameraStream] = createSignal(null);
  const [isLiveScanning, setIsLiveScanning] = createSignal(false);
  const [quaggaInit, setQuaggaInit] = createSignal(false);

  // Ref for video container
  let videoContainer;

  const handleFileInput = (event) => {
    const file = event.target.files[0];
    if (file) {
      resetScannerState();
      createImagePreview(file);
      decodeBarcode(file);
    }
  };

  const resetScannerState = () => {
    setImagePreview(null);
    setScanError(null);
    setIsScanning(true);
    setProductFound(false);
    setBarcodeData(null);
    setIsLiveScanning(false);
    setQuaggaInit(false);
  };

  const createImagePreview = (file) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const decodeBarcode = (imageFile) => {
    return new Promise((resolve, reject) => {
      Quagga.decodeSingle(
        {
          src: URL.createObjectURL(imageFile),
          numOfWorkers: 0, // Set to 0 to avoid worker initialization issues
          locate: true,
          inputStream: {
            size: 800,
            singleChannel: false // Changed to false to avoid initialization issues
          },
          decoder: {
            readers: ["ean_reader", "ean_8_reader", "code_128_reader", 
                     "code_39_reader", "upc_reader", "upc_e_reader"]
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

  const initQuaggaConfig = {
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: null, // Will be set later
      constraints: {
        width: 640,
        height: 480,
        facingMode: "environment"
      }
    },
    decoder: {
      readers: ["ean_reader", "ean_8_reader", "code_128_reader", 
                "code_39_reader", "upc_reader", "upc_e_reader"]
    },
    locate: true,
    numOfWorkers: 0 // Set to 0 to avoid worker initialization issues
  };

  const startLiveScanning = async () => {
    try {
      await stopLiveScanning();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      setCameraStream(stream);
      setIsLiveScanning(true);
      setScanError(null);

      // Update config with current target
      const config = { ...initQuaggaConfig };
      config.inputStream.target = videoContainer;

      try {
        await new Promise((resolve, reject) => {
          Quagga.init(config, (err) => {
            if (err) {
              console.error("Quagga initialization error:", err);
              reject(err);
              return;
            }
            setQuaggaInit(true);
            resolve();
          });
        });

        Quagga.start();
        
        Quagga.onDetected((result) => {
          if (result && result.codeResult) {
            setBarcodeData(result.codeResult.code);
            stopLiveScanning();
          }
        });

      } catch (quaggaError) {
        console.error("Quagga error:", quaggaError);
        throw new Error("Failed to initialize barcode scanner");
      }

    } catch (error) {
      console.error("Live scanning error:", error);
      setScanError("Could not access camera or start scanning");
      stopLiveScanning();
    }
  };

  const stopLiveScanning = async () => {
    if (quaggaInit()) {
      try {
        Quagga.offDetected();
        Quagga.stop();
      } catch (error) {
        console.warn("Error stopping Quagga:", error);
      }
      setQuaggaInit(false);
    }

    const stream = cameraStream();
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setCameraStream(null);
    }

    if (videoContainer) {
      videoContainer.innerHTML = '';
    }

    setIsLiveScanning(false);
    setScanError(null);
  };

  const clearScanner = () => {
    setBarcodeData(null);
    setImagePreview(null);
    setScanError(null);
    setProductFound(false);
    stopLiveScanning();
  };

  onCleanup(() => {
    stopLiveScanning();
  });

  return (
    <div class="barcode-scanner-container">
      <div class="scanner-card">
        <h2 class="scanner-title">Barcode Scanner</h2>
        
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
          <Show 
            when={!isLiveScanning()} 
            fallback={
              <button 
                onClick={stopLiveScanning} 
                class="stop-scan-button"
              >
                Stop Scanning
              </button>
            }
          >
            <button 
              onClick={startLiveScanning} 
              class="live-scan-button"
            >
              Live Scan
            </button>
          </Show>
        </div>

        <Show when={isLiveScanning()}>
          <div 
            ref={videoContainer}
            class="video-preview-container"
            style={{
              width: '100%',
              maxHeight: '300px',
              overflow: 'hidden'
            }}
          />
        </Show>

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

        <div class="manual-input-section">
          <h3>Or Enter Barcode Manually</h3>
          <div class="manual-input-wrapper">
            <input
              type="text"
              placeholder="Enter barcode number"
              value={barcodeData() || ''}
              onInput={(e) => {
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

        <Show when={scanError()}>
          <div class="error-message">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L1 21h22L12 2zm1 16h-2v-2h2v2zm0-4h-2V7h2v7z"/>
            </svg>
            <p>{scanError()}</p>
          </div>
        </Show>

        <Show when={barcodeData()}>
          <div class="barcode-display">
            <h3>Scanned Barcode:</h3>
            <p class="barcode-number">{barcodeData()}</p>
          </div>
        </Show>

        <Show when={barcodeData()}>
          <DataVisualizer 
            barcode={barcodeData()} 
            onProductFound={() => setProductFound(true)}
            onProductError={(error) => {
              setScanError(error);
            }}
          />
        </Show>
      </div>
    </div>
  );
};

export default BarcodeScanner;