import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";

export const analytics = async (req, res) => {
    try {
        const analyticsData = await getAnalyticsData();

        const endDate = new Date();
        const startDate = new Date(endDate.getTime()-7*24*60*60*1000);  //7 days ago

        const dailySalesData = await getDailySalesData(startDate,endDate);

        return res.status(200).json({analyticsData,dailySalesData});
    } catch (error) {
        console.log("Error in analytics controller ",error.message);
        return res.status(500).json({message:"Internal server error",error:error.message});
        
    }
}

async function getAnalyticsData(){
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();

    const salesData = await Order.aggregate([
        {
            $group: {
                _id:null, //it groups all documents together
                totalSales:{$sum:1},
                totalRevenue:{$sum:"$totalAmount"}
            }
        }
    ])
    const {totalSales,totalRevenue} = salesData[0] || {totalSales:0,totalRevenue:0};

    return {
        users:totalUsers,
        products:totalProducts,
        totalSales,
        totalRevenue
    }
}

async function getDailySalesData(startDate,endDate){
    try {
        const data = await Order.aggregate([
            {
                $match:{
                    createdAt:{
                        $gte:startDate,
                        $lte:endDate
                    }
                }
            },
            {
                $group:{
                    _id:{$dateToString:{format:"%Y-%m-%d",date:"$createdAt"}},
                    sales:{$sum:1},
                    revenue:{$sum:"$totalAmount"}
                }
            },
            {
                $sort:{
                    _id:1
                }
            }
        ])
    
        const dateArray = getDatesInRange(startDate,endDate);
    
        return dateArray.map(date => {
            const foundData = data.find(item => item._id === date);
    
            return {
                date,
                sales:foundData?.sales || 0,
                revenue:foundData?.revenue || 0,
            }
        })
    } catch (error) {
        throw error
    }
    
}

function getDatesInRange(startDate, endDate) {
    const dateArray = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        dateArray.push(currentDate.toISOString().split("T")[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dateArray;
}