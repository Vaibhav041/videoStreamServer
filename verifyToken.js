import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const token = req.cookies.access_token;
  if (!token) return next();

  jwt.verify(token, process.env.JWT, (err, user) => {
    if (err) return next(err);
    req.user = user;
    next()
  });
};