import Product from "../models/product.model.js"
import {redis} from "../lib/redis.js"
import cloudinary from "../lib/cloudinary.js"
export const getAllProducts = async (req, res) => {
    try {
        const products = await Product.find({})
        res.status(200).json({products})
    } catch (error) {
        console.log("Error in getAllProducts controller", error.message);
        return res.status(500).json({message:"server error",error:error.message})
        
    }
}

export const getFeaturedProducts = async (req,res) => {
    //we will store them in the mongoDB database and in redis as well as this will be accessed by everyone so it is better to keep in cache memory
    try {
        let featuredProducts = await redis.get("featured_products")  //get the featured products from redis
        if(featuredProducts){
            return res.status(200).json({products:JSON.parse(featuredProducts)})
        }
        //if not in redis, fetch from mongodb
        //.lean() is gonna return plain javascript object instead of mongodb document 
        //which is good for performance
        featuredProducts = await Product.find({isFeatured:true}).lean()
        if(!featuredProducts){
            return res.status(404).json({message: "No featured products found"})
        }

        //store in redis for the future quick access
        await redis.set("featured_products",JSON.stringify(featuredProducts))

        return res.status(200).json({products:featuredProducts})
    } catch (error) {
        console.log("Error in getFeaturedProducts controller", error.message);
        res.status(500).message({message:"server error",error:error.message})
        
    }
}

export const createProduct = async (req,res) => {
    try {
        const {name,description,price,category,image} = req.body;
        let cloudinaryResponse = null
        if(image){
            cloudinaryResponse = await cloudinary.uploader.upload(image,{folder:"products"})
        }
        const product = await Product.create({
            name,
            description,
            price,
            category,
            image: cloudinaryResponse?.secure_url ? cloudinaryResponse.secure_url : ""
        })
        return res.status(201).json(product)
    } catch (error) {
        console.log("Error in createProduct controller",error.message);
        return res.status(500).json({message:"Server error", error: error.message})
        
    }
}

export const deleteProduct = async(req,res) => {
    try {
        const {id} = req.params;
        const product = await Product.findById(id);
        if(!product){
            return res.status(404).json({message:"Product not found"})
        }
        let secureUrl = product.image;
        const publicId = secureUrl.split('/').slice(-1)[0].split('.')[0];
        try {
            await cloudinary.uploader.destroy(`products/${publicId}`)
            console.log("Image successfully deleted");
            
        } catch (error) {
            console.log("Error deleting image from cloudinary",error);
            
        }
        await Product.findByIdAndDelete(id);
        return res.status(200).json({message:"Product deleted successfully"})
    } catch (error) {
        console.log("Error in deleteProduct controller", error.message);
        return res.status(500).json({message:"server error", error:error.message})
        
    }
}

export const getRecommendedProducts = async (req,res) => {
    try {
        const products = await Product.aggregate([
            {
                $sample: {size:4}
            },
            {
                $project:{
                    _id:1,
                    name:1,
                    description:1,
                    image:1,
                    price:1
                }
            }
        ])
        console.log("Products", products);
        
        return res.status(200).json(products)
    } catch (error) {
        console.log("Error in getRecommendedProducts controller", error.message);
        return res.status(500).json({message:"Server error", error: error.message})
    }
}

export const getProductsByCategory = async (req,res) => {
    try {
        const {category} = req.params;
        const products = await Product.find({category})
        if(!products){
            return res.status(404).json({message:"Products not found"})
        }
        return res.status(200).json({products})
    } catch (error) {
        console.log("Error in getProductsByCategory controller", error.message);
        return res.status(500).json({message:"Server error", error: error.message})
    }
}

export const toggleFeaturedProduct = async (req,res) => {
    try {
        const product = await Product.findById(req.params.id);
		if (product) {
			product.isFeatured = !product.isFeatured;
			const updatedProduct = await product.save();
			await updateFeaturedProductsCache();
			res.json(updatedProduct);
		} else {
			res.status(404).json({ message: "Product not found" });
		}
    } catch (error) {
        console.log("Error in toggleFeaturedProduct controller", error.message);
        return res.status(500).json({message:"Server error", error: error.message})
        
    }
}

async function updateFeaturedProductsCache(){
    try {
        const featuredProducts = await Product.find({isFeatured:true}).lean()
        await redis.set("featured_products",JSON.stringify(featuredProducts))
    } catch (error) {
        console.log("Error in updateFeaturedProductsCache", error.message);
        
    }
}