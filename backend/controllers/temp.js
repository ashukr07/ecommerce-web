import Product from "../models/product.model.js"
export const getCartProducts = async (req,res) => {
    try {
      //console.log("CART ITEMS user",req.user);
      const productIds = req.user.cartItems.map(item => item.product); // Extract product IDs
        const products = await Product.find({_id:{$in: productIds}}); // Find products with the extracted IDs
        //console.log("CARTITEMS",req.user.cartItems);
        
        //add quantity for each product
        const cartItems = products.map(product => {
            const item = req.user.cartItems.find(cartItem => {
              // console.log("CARTITEM",cartItem);
              // console.log(cartItem.product);
              // console.log(product._id);
              cartItem.product === product._id});
            return {...product.toJSON(),quantity:item?.quantity||1 }
        })
        //console.log("CARTITEMS",cartItems);
        res.status(200).json(cartItems)
    } catch (error) {
        console.log("Error in getCartProducts controller", error.message);
    return res
        .status(500)
        .json({ message: "Server error", error: error.message });
    }
}

export const addToCart = async (req, res) => {
  try {
    //console.log(req.body);
    
    const { productId } = req.body;
    //console.log(productId);
    const user = req.user;
    //console.log(user)
    //console.log(typeof productId);
    
    //console.log("Type" ,typeof user?.cartItems[0]?.product)
    const existingItem = user.cartItems.find((item) => {
      const id = item.product.toString();
      //console.log("ID",id);
      return id === productId});
    //console.log(existingItem);
    if (existingItem) { 
      existingItem.quantity += 1;
    } else {
      user.cartItems.push({ product: productId, quantity: 1 });
    }
    await user.save();
    //req.user = user;
    return res.status(201).json(user.cartItems);
  } catch (error) {
    console.log("Error in addToCart controller", error.message);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

export const removeAllFromCart = async (req, res) => {
  try {
    const { productId } = req.body;
    //console.log("product",productId);
    
    const user = req.user;
    if (!productId) {
      user.cartItems = [];
    } else {
      user.cartItems = user.cartItems.filter((item) => {
        //console.log("ITEM", item);
        return String(item.product) !== productId});
    }
    await user.save();
    return res.status(201).json(user.cartItems);
  } catch (error) {
    console.log("Error in removeAllFromCart controller", error.message);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

export const updateQuantity = async (req, res) => {
    try {
        const { id: productId } = req.params;
        const user = req.user;
        const { quantity } = req.body;
        if (!quantity || isNaN(quantity)) {
          return res.status(400).json({ message: "Invalid quantity" });
        }
        // console.log("Type of productId",typeof productId);
        // console.log("Type of user",typeof user.cartItems[0].product);
        const existingItem = user.cartItems.find((item) => String(item.product) === productId);
        //console.log("Existing Item",existingItem);
        //console.log("Quantity",quantity);
        
        if (existingItem) {
        if (quantity === 0) {
            user.cartItems = user.cartItems.filter((item) => String(item.product) !== productId);
            await user.save();
            return res.status(201).json(user.cartItems);
        }
        existingItem.quantity = quantity;
        await user.save();
        //console.log("User",user.cartItems);
        
        return res.status(201).json(user.cartItems);
        } else {
        res.status(404).json({ message: "Product not found" });
        }
    } catch (error) {
        console.log("Error in removeAllFromCart controller", error.message);
        return res
        .status(500)
        .json({ message: "Server error", error: error.message });
    }
};