import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { redis } from "../lib/redis.js";
import bcrypt from "bcryptjs/dist/bcrypt.js";
import req from "express/lib/request.js";

const generateTokens = (userId) => {
    const accessToken = jwt.sign({userId},process.env.ACCESS_TOKEN_SECRET,{expiresIn:"15m"})
    const refreshToken = jwt.sign({userId},process.env.REFRESH_TOKEN_SECRET,{expiresIn:"7d"})
    return {accessToken,refreshToken}
}

const setCookies = (res,accessToken,refreshToken) => {
    res.cookie("accessToken",accessToken,{
        httpOnly:true, //prevent XSS attack, cross side scripting attack
        secure:process.env.NODE_ENV==="production",
        sameSite:"strict",//prevent CSRF attack, cross-site request forgery attack
        maxAge:15*60*1000 
    })
    res.cookie("refreshToken",refreshToken,{
        httpOnly:true, //prevent XSS attack, cross side scripting attack
        secure:process.env.NODE_ENV==="production",
        sameSite:"strict",//prevent CSRF attack, cross-site request forgery attack
        maxAge:7*24*60*60*1000 
    })
}

const storeRefreshToken = async(userId,refreshToken) => {
    await redis.set(`refresh_token:${userId}`,refreshToken,"EX",7*24*60*60)
}

export const signup = async (req,res) => {
    try {
        const {email,password,name} = req.body;
        const userExists = await User.findOne({email});
        
        if(userExists){
            return res.status(400).json({message:"User already exists"});
        }
    
        const user = await User.create({email,password,name})

        //authenticate
        const {accessToken, refreshToken} = generateTokens(user._id);
        storeRefreshToken(user._id,refreshToken)

        setCookies(res,accessToken,refreshToken)
        res.status(201).json({user: {
            _id:user._id,
            name:user.name,
            email:user.email,
            role:user.role
        },message:"user created successfully"})
    } catch (error) {
        console.log("Error in signup controller", error.message);
        return res.status(500).json({message:error.message})
    }
}

export const login = async (req,res) => {
    try {
        const {email,password} = req.body;
        const user = await User.findOne({email});
        if(!user) return res.status(400).json({message:"User not found"})
        const isPasswordValid = await user.comparePassword(password);  
        if(!isPasswordValid){
            return res.status(400).json({message:"Invalid password"})
        } 
        const {accessToken, refreshToken} = generateTokens(user._id);
        storeRefreshToken(user._id,refreshToken)
        setCookies(res,accessToken,refreshToken)
        return res.status(200).json({user: {
            _id:user._id,
            name:user.name,
            email:user.email,
            role:user.role
        },message:"user logged in successfully"})

    } catch (error) {
        console.log("Error in login controller", error.message);
        return res.status(500).json({message:error.message})
    }
}

export const logout = async (req,res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if(!refreshToken) return res.status(400).json({message:"User not logged in"})
        const decoded = jwt.verify(refreshToken,process.env.REFRESH_TOKEN_SECRET)
    console.log(decoded)
    await redis.del(`refresh_token:${decoded.userId}`)
    res.clearCookie("accessToken")
    res.clearCookie("refreshToken")
    res.status(200).json({message:"User logged out successfully"})

    } catch (error) {
        console.log("Error in logout controller", error.message);
        return res.status(500).json({message:"Server error",error:error.message})
    }
}

export const refreshToken = async (req,res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if(!refreshToken){
            return res.status(400).json({message:"User not logged in"})
        } 
        const decoded = jwt.verify(refreshToken,process.env.REFRESH_TOKEN_SECRET)
        const storedToken = await redis.get(`refresh_token:${decoded.userId}`);
        if(refreshToken !== storedToken){
            return res.status(400).json({message:"Invalid refresh token"})
        }
        const accessToken = jwt.sign({userId:decoded.userId},process.env.ACCESS_TOKEN_SECRET,{expiresIn:"15m"}) 
        res.cookie("accessToken",accessToken,{
            httpOnly:true, //prevent XSS attack, cross side scripting attack
            secure:process.env.NODE_ENV==="production",
            sameSite:"strict",//prevent CSRF attack, cross-site request forgery attack
            maxAge:15*60*1000 
        })
        return res.status(200).json({message:"Token refreshed successfully"})
    } catch (error) {
        console.log("Error in refreshToken controller", error.message); 
        return res.status(500).json({message:"Server error",error:error.message})
        
    }
}

export const getProfile = async (req,res) => {
    try {
        //console.log(req.user);
        
		res.json(req.user);
	} catch (error) {
		res.status(500).json({ message: "Server error", error: error.message });
	}
}
