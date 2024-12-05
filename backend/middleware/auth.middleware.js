import jwt from "jsonwebtoken"
import User from "../models/user.model.js";


export const protectRoute = async (req,res, next) => {
    try {
        const accessToken = req.cookies.accessToken;
        if(!accessToken){
            return res.status(400).json({message:"Unauthorized-No access token provided"})
        }
        try {
            const decoded = jwt.verify(accessToken,process.env.ACCESS_TOKEN_SECRET)
            const user = await User.findById(decoded.userId).select("-password")
            if(!user){
                return res.status(400).json({message:"user not found"})
            }
        
            req.user = user;
            next()
        } catch (error) {
            if(error.name === "TokenExpiredError"){
                return res.status(400).json({message:"Unauthorized - Access Token expired"})
            }
            throw error
        }
    } catch (error) {
        console.log("Error in protectRoute middleware", error.message);
        return res.status(400).json({message:"Unauthorized - Invalid token"}) 
    }
}

export const adminRoute = async (req,res,next) => {
    if(req.user && req.user.role === "admin"){
        next()
    }
    else{
        return res.status(403).json({message:"Access denied - Admin onlyz"})
    }
}