import dotenv from "dotenv";
dotenv.config()

import mongoose, {model, Schema} from "mongoose";
const ObjectId = mongoose.Types.ObjectId;

async function main () {
    try {
        const MONGO_URL = process.env.MONGO_URL;
        if(!MONGO_URL) {
            throw new Error ("Mongo URL is missing from .env")
        }
        await mongoose.connect(MONGO_URL)
        console.log("MongoDB is connected Successfully!")
    }
    catch (error) {
        console.error("MongoDB Connection Error", error);
        process.exit(1);
    }
}

main();

const UserSchema = new Schema ({
    username: {type: String, unique: true},
    password: String,
    name: String
})

export const UserModel = model("User", UserSchema);