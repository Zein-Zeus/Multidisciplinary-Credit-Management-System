const mongoose=require("mongoose")

mongoose.connect("mongodb://localhost:27017/studentData")
.then(()=>{
    console.log("Mongodb Connected");
})
.catch(()=>{
    console.log("Failed to Connect");
})

const studentSchema=new mongoose.Schema({
    studentName:{
        type:String,
        required:true
    },
    prnNumber:{
        type:Number,
        required:true,
        unique:true
    },
    Email:{
        type:String,
        required:true
    },
    Contact:{
        type:Number,
        required:true
    },
    collegeName:{
        type:String,
        required:true
    },
    abcId:{
        type:Number,
        required:true,
        unique:true
    }
})

studentSchema.index({
    prnNumber: 1, abcId: 1
}, { unique: true });

const collection=new mongoose.model("students",studentSchema)
module.exports=collection