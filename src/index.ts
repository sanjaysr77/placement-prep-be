import express from "express";
import jwt from "jsonwebtoken";
import { UserModel } from "./db";
const jwtSecret = process.env.JWT_SECRET as string;
import cors from "cors";
import { z } from "zod";
import bcrypt from "bcrypt"
import { userMiddleware } from "./middleware/userMiddleware";
import questionRoutes from "./routes/questionRoutes";

const app = express();
app.use(express.json());
app.use(cors());

app.post("/signup", async (req, res) => {

    const requiredBody = z.object({
        email: z.string().min(3).max(50),
        username: z.string().min(3).max(20),
        password: z.string().min(3).max(20),
    })

    const parsedData = requiredBody.safeParse(req.body);
    if (!parsedData.success) {
        return res.json({
            message: "Incorrect Format",
            error: parsedData.error
        })
    }

    const { email, password, username } = req.body
    const findUser = await UserModel.findOne({ email });
    if (findUser) {
        return res.json({ message: "User already exists." })
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 3)

        await UserModel.create({
            email, password: hashedPassword, username
        })
        res.json({ messsage: "You are signed up" })
    }
    catch (e) {
        res.json({ message: "Internal Server Error" })
    }
})


app.post("/signin", async (req, res) => {
    const { email, password } = req.body;
    const admin = await UserModel.findOne({
        email: email
    })
    if (!admin) {
        return res.json({ message: "User Email Incorrect" })
    }
    //@ts-ignore
    const isMatch = await bcrypt.compare(password, admin.password)
    if (!isMatch) {
        return res.json("Incorrect Password")
    }

    const token = jwt.sign({ id: admin._id }, jwtSecret)
    res.json({ token })
})

app.use("/v1/topicwise", questionRoutes);

app.listen(3000, () => {
    console.log("Running on Port 3000")
})

