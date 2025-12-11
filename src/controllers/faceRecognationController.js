exports.registerFaceID = async(req ,res)=>{
    try {
        console.log("<><>req.body",req.body)
        console.log("<><>FILES:", req.files); 
    } catch (error) {
        return res.status(500).send({status:false,message:"internal server down", error:error.message})
    }
}

exports.loginFaceID = async(req ,res)=>{
    try {
                console.log("<><>req.body",req.body)
    } catch (error) {
        return res.status(500).send({status:false,message:"internal server down", error:error.message})
    }
}



