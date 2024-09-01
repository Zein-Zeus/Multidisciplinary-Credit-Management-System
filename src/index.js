const express=require("express")
const app=express()
const path=require("path")
const hbs=require("hbs")
const collection=require("./mongodb")

// const templatePath=path.join(__dirname,'../templates')

const publicPath = path.resolve(__dirname, "public");

// app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'))

app.use(express.json())
app.set("view engine", "hbs")
// app.set("views",templatePath)
app.use(express.urlencoded({extended:false}))
// app.use(express.static(publicPath))
// app.use("/images", express.static(path.join(__dirname, "/public/images")));

// Route to display static src images
// app.get("/static", (req, res) => {
//     res.render("static");
// });

// Route to display dynamic src images
// app.get("/dynamic", (req, res) => {
//     imageList = [];
//     imageList.push({ src: "icons/flask.png", name: "flask" });
//     imageList.push({ src: "icons/javascript.png", name: "javascript" });
//     imageList.push({ src: "icons/react.png", name: "react" });
//     res.render("dynamic", { imageList: imageList });
// });

app.get("/",(req,res)=>{
    res.render("login")
})

app.get("/login",(req,res)=>{
    res.render("login")
})

app.get("/signup",(req,res)=>{
    res.render("signup")
})

app.get("/home",(req,res)=>{
    res.render("home")
})

app.get("/dashboard",(req,res)=>{
    res.render("dashboard")
})

app.get("/course",(req,res)=>{
    res.render("courses")
})

app.get("/AICoursePage",(req,res)=>{
    res.render("AICoursePage")
})

app.get("/certificate",(req,res)=>{
    res.render("certificate")
})

app.post("/signup", async (req, res) => {
    const data = {
        studentName: req.body.studentName,
        prnNumber: req.body.prnNumber,
        Email: req.body.Email,
        Contact: req.body.Contact,
        collegeName: req.body.collegeName,
        abcId: req.body.abcId
    };

    try {
        await collection.insertMany([data]);
        res.render("login");
    } catch (error) {
        if (error.name === 'ValidationError') {
            for (let field in error.errors) {
                console.error(`Validation error in ${field}: ${error.errors[field].message}`);
            }
        } else {
            console.error("Unexpected error:", error);
        }
        res.status(400).send("Error: Validation failed. Please check your input.");
    }
});

app.post("/login", async (req, res) => {

    try {
        const check=await collection.findOne({prnNumber: req.body.prnNumber})
        
        if(check.abcId===req.body.abcId || check.studentName===req.body.studentName){
            res.render("home");
        }
        else{
            res.send("Wrong Details")
        }

        
    } catch {
        res.send("Wrong Details")
    }
});

app.listen(3000, ()=>{
    console.log("Port Connected")
})
