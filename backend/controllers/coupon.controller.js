import Coupon from "../models/coupon.model.js"

export const getCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findOne({userId:req.user._id,isActive:true});
        return res.status(200).json(coupon || null)
    } catch (error) {
        console.log("Error in getCoupon controller", error.message);
        return res
            .status(500)
            .json({ message: "Server error", error: error.message });
        
    }
}

export const validateCoupon = async (req, res) => {
    try {
        const {code} = req.body;
        const coupon = await Coupon.findOne({code,userId:req.user._id,isActive:true});
        if(!coupon){
            return res.status(400).json({message:"Invalid coupon"})
        }
        if(coupon.expirationDate < new Date()){
            return res.status(404).json({message:"Coupon expired"})
        }
        return res.status(200).json({
            message:"Coupon validated",
            code:coupon.code,
            discountPercentage:coupon.discountPercentage,
        })

    } catch (error) {
        console.log("Error in validateCoupon controller", error.message);
        return res
            .status(500)
            .json({ message: "Server error", error: error.message });
        
    }
}