import express from "express";
import cors from "cors";
import User from "./DB/User.js";
import Video from "./DB/Video.js";
import mongoose from 'mongoose';
// import "./DB/config.js";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { verifyToken } from "./verifyToken.js";
const app = express();

const corsConfig = {
  origin: true, //included origin as true
    credentials: true, //included credentials as true
}

app.use(express.json());
app.use(cors(corsConfig));
app.use(cookieParser());
dotenv.config();

var farFuture = new Date(new Date().getTime() + (1000*60*60*24*365*10));

mongoose.connect(process.env.MONGO, {useNewUrlParser: true}).then(() => {
  console.log('db');
});


//auth
app.post("/register", async (req, res, next) => {
  try {
    let user = new User(req.body);
    await user.save();
    res.send(user);
  }
  catch(err) {
    res.json({error:"user already exists"});
  }
});
app.post("/login", async (req, res, next) => {
  let data = await User.findOne(req.body).select("-password");
  if (data) {
    const token = jwt.sign({ id: data._id }, process.env.JWT);
    const val = data._doc;
    // res.send({...val, result:"logged In"});
    res
      .cookie("access_token", token, {expires: farFuture })
      .status(200)
      .json({ ...val, result: "logged in" });
  } else {
    res.json({ error: "no user found" });
  }
});

//user
app.get("/user/getUser/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
});

app.put('/user/update/:id', verifyToken, async (req, res, next) => {
  if (req.params.id === req.user.id) {
    try {
      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        {
          $set: req.body,
        },
        { new: true }
      );
      res.status(200).json(updatedUser);
    } catch (err) {
      next(err);
    }
  } else {
    return next(createError(403, "You can update only your account!"));
  }
})

app.delete('/user/delete/:id', verifyToken, async (req, res, next) => {
  if (req.params.id === req.user.id) {
    try {
      await User.findByIdAndDelete(req.params.id);
      res.status(200).json("User has been deleted.");
    } catch (err) {
      next(err);
    }
  } else {
    return next(createError(403, "You can delete only your account!"));
  }
})

app.put("/user/like/:videoId", verifyToken, async (req, res, next) => {
  const id = req.user.id;
  const videoId = req.params.videoId;
  try {
    await Video.findByIdAndUpdate(videoId, {
      $addToSet: { likes: id },
      $pull: { dislikes: id },
    });
    res.status(200).json("The video has been liked.");
  } catch (err) {
    next(err);
  }
});
app.put("/user/dislike/:videoId", verifyToken, async (req, res, next) => {
  const id = req.user.id;
  const videoId = req.params.videoId;
  try {
    await Video.findByIdAndUpdate(videoId, {
      $addToSet: { dislikes: id },
      $pull: { likes: id },
    });
    res.status(200).json("The video has been disliked.");
  } catch (err) {
    next(err);
  }
});

//video
app.post("/video/add", verifyToken, async (req, res, next) => {
  const newVideo = new Video({ userId: req.user.id, ...req.body });
  try {
    const savedVideo = await newVideo.save();
    res.status(200).json(savedVideo);
  } catch (err) {
    next(err);
  }
});

app.get('/video/get/:id', async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    res.status(200).json(video);
  } catch (err) {
    next(err);
  }
})

app.get("/video/get", async (req, res, next) => {
  try {
    const videos = await Video.aggregate([{ $sample: { size: 40 } }]);
    res.status(200).json(videos);
  } catch (err) {
    next(err);
  }
});

app.put('/video/update/:id', verifyToken, async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return next(createError(404, "Video not found!"));
    if (req.user.id === video.userId) {
      const updatedVideo = await Video.findByIdAndUpdate(
        req.params.id,
        {
          $set: req.body,
        },
        { new: true }
      );
      res.status(200).json(updatedVideo);
    } else {
      return next(createError(403, "You can update only your video!"));
    }
  } catch (err) {
    next(err);
  }
})

app.delete('/video/delete/:id', verifyToken, async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return next(createError(404, "Video not found!"));
    if (req.user.id === video.userId) {
      await Video.findByIdAndDelete(req.params.id);
      res.status(200).json("The video has been deleted.");
    } else {
      return next(createError(403, "You can delete only your video!"));
    }
  } catch (err) {
    next(err);
  }
})

app.put("/video/view/:id", async (req, res, next) => {
  try {
    await Video.findByIdAndUpdate(req.params.id, {
      $inc: { views: 1 },
    });
    res.status(200).json("The view has been increased.");
  } catch (err) {
    next(err);
  }
});
app.get('/video/getAll/:id', async (req, res, next) => {
  try {
    const videos = await Video.find({userId: req.params.id});
    res.status(200).json(videos);
  } catch (err) {
    next(err);
  }
})

app.listen(9000, () => {
  console.log("connected");
});
