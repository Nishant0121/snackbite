import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase.jsx";

const CACHE_DURATION = 30000; // 30 seconds
let cartCache = new Map();

const getMenuItems = async () => {
  try {
    const itemsCollection = collection(db, "items");
    const querySnapshot = await getDocs(itemsCollection);
    const menuItems = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return menuItems;
  } catch (error) {
    console.error("Error fetching menu from Firestore:", error);
    throw error;
  }
};

// Get user's cart from Firebase
const getUserCart = async (userId) => {
  if (!userId) return { items: [] };

  const now = Date.now();
  const cached = cartCache.get(userId);

  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const cartDoc = doc(db, "carts", userId);
    const cartSnapshot = await getDoc(cartDoc);

    const cartData = cartSnapshot.exists()
      ? cartSnapshot.data()
      : { items: [] };

    cartCache.set(userId, {
      data: cartData,
      timestamp: now,
    });

    return cartData;
  } catch (error) {
    console.error("Error fetching user cart:", error);
    throw error;
  }
};

// Add item to cart
const addToCart = async (userId, item, quantity, customizations) => {
  try {
    const cartDoc = doc(db, "carts", userId);
    const cartSnapshot = await getDoc(cartDoc);

    if (cartSnapshot.exists()) {
      // Cart exists, update it
      const currentCart = cartSnapshot.data();
      const existingItemIndex = currentCart.items.findIndex(
        (cartItem) =>
          cartItem.id === item.id &&
          cartItem.customizations?.spiceLevel === customizations?.spiceLevel &&
          JSON.stringify(cartItem.customizations?.addOns) ===
            JSON.stringify(customizations?.addOns)
      );

      if (existingItemIndex !== -1) {
        // Item with same customizations exists in cart, update quantity
        currentCart.items[existingItemIndex].quantity += quantity;
      } else {
        // Add new item to cart with customizations
        currentCart.items.push({
          ...item,
          quantity,
          customizations,
        });
      }

      currentCart.updatedAt = new Date().toISOString();
      await updateDoc(cartDoc, currentCart);
      updateCartCache(userId, currentCart);
      return currentCart;
    } else {
      // Create new cart
      const newCart = {
        items: [{ ...item, quantity, customizations }],
        updatedAt: new Date().toISOString(),
      };
      await setDoc(cartDoc, newCart);
      updateCartCache(userId, newCart);
      return newCart;
    }
  } catch (error) {
    console.error("Error updating cart:", error);
    throw error;
  }
};

// Remove item from cart
const removeFromCart = async (userId, itemId) => {
  try {
    const cartDoc = doc(db, "carts", userId);
    const cartSnapshot = await getDoc(cartDoc);

    if (cartSnapshot.exists()) {
      const currentCart = cartSnapshot.data();
      currentCart.items = currentCart.items.filter(
        (item) => item.id !== itemId
      );
      currentCart.updatedAt = new Date().toISOString();

      await updateDoc(cartDoc, currentCart);
      return currentCart;
    }
    return null;
  } catch (error) {
    console.error("Error removing item from cart:", error);
    throw error;
  }
};

// Update item quantity in cart
const updateCartItemQuantity = async (userId, itemId, quantity) => {
  try {
    const cartDoc = doc(db, "carts", userId);
    const cartSnapshot = await getDoc(cartDoc);

    if (cartSnapshot.exists()) {
      const currentCart = cartSnapshot.data();
      const itemIndex = currentCart.items.findIndex(
        (item) => item.id === itemId
      );

      if (itemIndex !== -1) {
        currentCart.items[itemIndex].quantity = quantity;
        currentCart.updatedAt = new Date().toISOString();

        await updateDoc(cartDoc, currentCart);
        return currentCart;
      }
    }
    return null;
  } catch (error) {
    console.error("Error updating item quantity:", error);
    throw error;
  }
};

// Modify other cart operations to update cache
const updateCartCache = (userId, cartData) => {
  cartCache.set(userId, {
    data: cartData,
    timestamp: Date.now(),
  });
};

export {
  getMenuItems,
  getUserCart,
  addToCart,
  removeFromCart,
  updateCartItemQuantity,
};
