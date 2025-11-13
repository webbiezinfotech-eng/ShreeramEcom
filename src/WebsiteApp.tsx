import { Routes, Route } from 'react-router-dom';
import FeaturedProducts from "./Components/FeaturedProducts.jsx";
import Hero from "./Components/Hero.jsx";
import WhyChoose from "./Components/WhyChoose.jsx";
import Footer from "./Components/Footer.jsx";
import Navbar from "./Components/Navbar.jsx";
import Login from "./Components/Login.jsx";
import Register from "./Components/Register.jsx";
import Profile from "./Components/Profile.jsx";
import Cart from "./Components/Cart.jsx";
import Checkout from "./Components/Checkout.jsx";
import PlaceOrder from "./Components/PlaceOrder.jsx";
import About from "./Components/About.jsx";
import Contact from "./Components/Contact.jsx";
import ProductsPage from "./Components/ProductsPage.jsx";
import Quote from "./Components/Quote.jsx";
import CategoryPage from "./Components/CategoryPage.jsx";
import ProductDetail from "./Components/ProductDetail.jsx";

function WebsiteApp() {
  return (
    <div className="">
      <Routes>
        <Route path="/" element={
          <>
            <Navbar/>
            <Hero/>
            <FeaturedProducts/>
            <WhyChoose/>
            <Footer/>
          </>
        } />
        <Route path="/login" element={
          <>
            <Navbar/>
            <Login/>
            <Footer/>
          </>
        } />
        <Route path="/register" element={
          <>
            <Navbar/>
            <Register/>
            <Footer/>
          </>
        } />
        <Route path="/profile" element={
          <>
            <Navbar/>
            <Profile/>
            <Footer/>
          </>
        } />
        <Route path="/cart" element={
          <>
            <Navbar/>
            <Cart/>
            <Footer/>
          </>
        } />
        <Route path="/checkout" element={
          <>
            <Navbar/>
            <Checkout/>
            <Footer/>
          </>
        } />
        <Route path="/place-order" element={
          <>
            <Navbar/>
            <PlaceOrder/>
            <Footer/>
          </>
        } />
        <Route path="/about" element={
          <>
            <Navbar/>
            <About/>
            <Footer/>
          </>
        } />
        <Route path="/contact" element={
          <>
            <Navbar/>
            <Contact/>
            <Footer/>
          </>
        } />
        <Route path="/products" element={
          <>
            <Navbar/>
            <ProductsPage/>
            <Footer/>
          </>
        } />
        <Route path="/product/:id" element={
          <>
            <Navbar/>
            <ProductDetail/>
            <Footer/>
          </>
        } />
        <Route path="/quote" element={
          <>
            <Navbar/>
            <Quote/>
            <Footer/>
          </>
        } />
        <Route path="/category/:category" element={
          <>
            <Navbar/>
            <CategoryPage/>
            <Footer/>
          </>
        } />
      </Routes>
    </div>
  );
}

export default WebsiteApp;
