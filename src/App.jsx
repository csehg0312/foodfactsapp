// import logo from './logo.svg';
import styles from './App.module.css';
import OfflineNotification from './components/OfflineNotification';
import BarcodeScanner from './components/BarcodeScanner';


function App() {

  return (
    <div class={styles.App}>
      <OfflineNotification />
      
      <header class={styles.header}>
        <div class={styles.titleContainer}>
          <p class={styles.title}>
            SolidJS Barcode Scanner
          </p>
        </div>
        <BarcodeScanner />
      </header>
    </div>
  );
}

export default App;