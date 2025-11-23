import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './contexts/CartContext';
import { WishlistProvider } from './contexts/WishlistContext';
import WebsiteApp from './WebsiteApp';
import AdminApp from './admin/AdminApp';

function App() {
  return (
    <Router>
      <Routes>
        {/* Admin Routes */}
        <Route path="/admin/*" element={<AdminApp />} />
        
        {/* Website Routes - Default */}
        <Route path="/*" element={
          <CartProvider>
            <WishlistProvider>
              <WebsiteApp />
            </WishlistProvider>
          </CartProvider>
        } />
      </Routes>
    </Router>
  );
}

export default App;
