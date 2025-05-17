import express from "express";
import jwt from "jsonwebtoken";
import { UserModel } from "./db";
const jwtSecret = process.env.JWT_SECRET as string;
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

app.post("/api/signup", async (req, res) => {

    const username = req.body.username;
    const password = req.body.password;

    try {
        await UserModel.create({
            username: username,
            password: password
        })

        res.json({
            message: "User signed up"
        })
    } catch (e) {
        res.status(411).json({
            message: "User already exists"
        })
    }
})

app.post("/api/signin", async (req, res) => {
    
    const username = req.body.username;
    const password = req.body.password;
    // console.log(username)
    // console.log(password)

    const existingUser = await UserModel.findOne ({
        username
    })
    if (existingUser) {
        const token = jwt.sign ({
            id: existingUser._id
        }, jwtSecret)
        
        res.json({
            token
        })
    } else {
        res.status(403).json ({
            message: "Incorrect Credentials "
        })
    }
        
})

app.listen(3000, () => {
    console.log("Running on Port 3000")
})

