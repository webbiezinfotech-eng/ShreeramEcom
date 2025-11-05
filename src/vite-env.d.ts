/// <reference types="vite/client" />

// Allow JSX files to be imported in TypeScript
declare module "*.jsx" {
  import { ComponentType } from "react";
  const Component: ComponentType<any>;
  export default Component;
}

// Allow JSX context files
declare module "./contexts/CartContext.jsx" {
  export const CartProvider: ComponentType<any>;
  export const useCart: () => any;
}
