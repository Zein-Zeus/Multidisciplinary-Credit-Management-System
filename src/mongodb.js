const mongoose=require("mongoose")
const bcrypt = require('bcrypt')

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
    },
    password:{
      type:String,
      required:true,
      
    }
})

// studentSchema.pre('save', function(next){
//   if(this.isModified('password')){
//     bcrypt.hash(this.password, 8, (err, hash) => {
//       if(err) return next(err);

//       this.password = hash;
//       next();
//     })
//   }
// })

// studentSchema.methods.comparePassword = async function(password) {
//   if(!password) throw new Error('Password is missing');

//   try {
//     const result = await bcrypt.compare(password, this.password)
//     return result;
//   } catch (error) {
//     console.log('Error while comparing password', error.message)
//   }
// }

studentSchema.index({
    prnNumber: 1, abcId: 1
}, { unique: true });

const collection=new mongoose.model("studentNew",studentSchema)
module.exports=collection